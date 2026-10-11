import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AprobarPrestamoSchema } from "@/lib/validations";
import { bloquearMateriales, calcularDisponibilidad, validarRangoPrestamo } from "@/lib/disponibilidad";
import { esFechaValida, parseFecha } from "@/lib/fechas";

type Params = { params: Promise<{ id: string }> };

class ErrorAprobacion extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const solicitudId = parseInt(id, 10);
  if (isNaN(solicitudId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const result = AprobarPrestamoSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  if (result.data.fechaDevolucionEsperada && !esFechaValida(result.data.fechaDevolucionEsperada)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const admin = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const solicitud = await tx.solicitudPrestamo.findUnique({
        where: { id: solicitudId },
        include: { detalles: { select: { materialId: true, cantidad: true } } },
      });
      if (!solicitud) throw new ErrorAprobacion("Solicitud no encontrada", 404);

      // Bloquear los materiales antes de calcular: otra aprobación simultánea
      // sobre los mismos materiales espera a que esta transacción termine.
      await bloquearMateriales(tx, solicitud.detalles.map((d) => d.materialId));

      // Releer el estado ya con el bloqueo tomado
      const actual = await tx.solicitudPrestamo.findUnique({ where: { id: solicitudId }, select: { estado: true } });
      if (actual?.estado !== "PENDIENTE") throw new ErrorAprobacion("Solo se pueden aprobar solicitudes pendientes");

      const fechaDevolucionEsperada = result.data.fechaDevolucionEsperada
        ? parseFecha(result.data.fechaDevolucionEsperada)
        : solicitud.fechaDevolucionEsperada;
      const errorRango = validarRangoPrestamo(solicitud.fechaRetiro, fechaDevolucionEsperada, { permitirPasado: true });
      if (errorRango) throw new ErrorAprobacion(errorRango);

      const disponibilidad = await calcularDisponibilidad(
        tx,
        solicitud.detalles.map((d) => d.materialId),
        solicitud.fechaRetiro,
        fechaDevolucionEsperada,
        { excluirSolicitudId: solicitudId }
      );

      for (const d of solicitud.detalles) {
        const m = disponibilidad.get(d.materialId);
        if (!m) throw new ErrorAprobacion("Material no encontrado");
        if (m.estado !== "DISPONIBLE") throw new ErrorAprobacion(`"${m.nombre}" ya no está disponible para préstamo`);
        if (m.disponible < d.cantidad) {
          throw new ErrorAprobacion(
            `Stock insuficiente de "${m.nombre}" para esas fechas: se solicitan ${d.cantidad} y hay ${m.disponible} disponible${m.disponible === 1 ? "" : "s"}`
          );
        }
      }

      return tx.solicitudPrestamo.update({
        where: { id: solicitudId },
        data: {
          estado: "APROBADA",
          fechaAprobacion: new Date(),
          fechaDevolucionEsperada,
          aceptadoPor: admin.id,
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ErrorAprobacion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error al aprobar préstamo:", error);
    return NextResponse.json({ error: "Error al aprobar la solicitud" }, { status: 500 });
  }
}
