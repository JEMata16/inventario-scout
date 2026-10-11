import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateSolicitudPrestamoSchema } from "@/lib/validations";
import { calcularDisponibilidad, clasificarConflictos, validarRangoPrestamo } from "@/lib/disponibilidad";
import { esFechaValida, hoyCR, parseFecha } from "@/lib/fechas";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const role = session.user.role;
  const userId = parseInt(session.user.id, 10);

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado") ?? "";
  const search = searchParams.get("search") ?? "";
  const seccion = searchParams.get("seccion") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (role !== "ADMIN") where.usuarioId = userId;
  if (estado === "POR_ENTREGAR" && role === "ADMIN") {
    where.estado = "APROBADA";
    where.fechaRetiro = { lte: hoyCR() };
  } else if (estado === "VENCIDAS" && role === "ADMIN") {
    where.estado = "ENTREGADA";
    where.fechaDevolucionEsperada = { lt: hoyCR() };
  } else if (estado) {
    where.estado = estado;
  }
  if (role === "ADMIN" && seccion) where.usuario = { seccion };
  if (search && role === "ADMIN") {
    where.OR = [
      { responsable: { contains: search } },
      { actividad: { contains: search } },
      { usuario: { nombre: { contains: search } } },
      { detalles: { some: { material: { nombre: { contains: search } } } } },
    ];
  }

  const [solicitudes, total] = await Promise.all([
    prisma.solicitudPrestamo.findMany({
      where,
      skip,
      take: limit,
      // Pendientes primero por fecha de retiro más próxima; el resto, lo más reciente primero
      orderBy:
        estado === "PENDIENTE" || estado === "POR_ENTREGAR"
          ? { fechaRetiro: "asc" }
          : estado === "VENCIDAS"
            ? { fechaDevolucionEsperada: "asc" }
            : { fechaSolicitud: "desc" },
      include: {
        usuario: { select: { nombre: true, seccion: true, email: true } },
        detalles: {
          include: {
            material: { select: { nombre: true, categoria: true } },
          },
        },
      },
    }),
    prisma.solicitudPrestamo.count({ where }),
  ]);

  // Para el admin, marcar las solicitudes pendientes con conflictos de stock
  const conflictos =
    role === "ADMIN"
      ? await clasificarConflictos(prisma, solicitudes.filter((s) => s.estado === "PENDIENTE"))
      : new Map();

  return NextResponse.json({
    solicitudes: solicitudes.map((s) => ({ ...s, conflicto: conflictos.get(s.id) ?? null })),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role === "ADMIN") {
    return NextResponse.json({ error: "Las solicitudes se hacen desde la cuenta de una sección" }, { status: 403 });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true, estado: true },
  });
  if (!usuario || !usuario.estado) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });

  const body = await request.json();
  const result = CreateSolicitudPrestamoSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? "Datos inválidos", details: result.error.issues },
      { status: 400 }
    );
  }

  const { materiales, responsable, actividad } = result.data;
  if (!esFechaValida(result.data.fechaRetiro) || !esFechaValida(result.data.fechaDevolucionEsperada)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }
  const fechaRetiro = parseFecha(result.data.fechaRetiro);
  const fechaDevolucionEsperada = parseFecha(result.data.fechaDevolucionEsperada);
  const errorRango = validarRangoPrestamo(fechaRetiro, fechaDevolucionEsperada);
  if (errorRango) return NextResponse.json({ error: errorRango }, { status: 400 });

  // Solo se valida contra préstamos aprobados/entregados. Las solicitudes pendientes
  // de otras secciones no bloquean: el formulario ya advirtió del posible conflicto
  // y el administrador decide al aprobar.
  const disponibilidad = await calcularDisponibilidad(
    prisma,
    materiales.map((m) => m.materialId),
    fechaRetiro,
    fechaDevolucionEsperada
  );

  for (const req of materiales) {
    const m = disponibilidad.get(req.materialId);
    if (!m) return NextResponse.json({ error: `Material #${req.materialId} no encontrado` }, { status: 400 });
    if (m.estado !== "DISPONIBLE") return NextResponse.json({ error: `"${m.nombre}" no está disponible para préstamo` }, { status: 400 });
    if (m.disponible < req.cantidad) {
      return NextResponse.json(
        { error: `Solo hay ${m.disponible} unidad${m.disponible === 1 ? "" : "es"} de "${m.nombre}" disponible${m.disponible === 1 ? "" : "s"} para esas fechas` },
        { status: 400 }
      );
    }
  }

  const solicitud = await prisma.solicitudPrestamo.create({
    data: {
      usuarioId: usuario.id,
      estado: "PENDIENTE",
      responsable,
      actividad: actividad || null,
      fechaRetiro,
      fechaDevolucionEsperada,
      detalles: {
        create: materiales.map((m) => ({ materialId: m.materialId, cantidad: m.cantidad })),
      },
    },
    include: {
      detalles: { include: { material: { select: { nombre: true } } } },
    },
  });

  return NextResponse.json(solicitud, { status: 201 });
}
