import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateSolicitudPrestamoSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = parseInt(session.user.id, 10);

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (role !== "ADMIN") where.usuarioId = userId;
  if (estado) where.estado = estado;
  if (search && role === "ADMIN") {
    where.usuario = {
      OR: [
        { nombre: { contains: search } },
        { apellido: { contains: search } },
        { email: { contains: search } },
      ],
    };
  }

  const [solicitudes, total] = await Promise.all([
    prisma.solicitudPrestamo.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fechaSolicitud: "desc" },
      include: {
        usuario: { select: { nombre: true, apellido: true, email: true } },
        detalles: {
          include: {
            material: { select: { nombre: true, imagen: true, categoria: true } },
          },
        },
      },
    }),
    prisma.solicitudPrestamo.count({ where }),
  ]);

  return NextResponse.json({
    solicitudes,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });

  const body = await request.json();
  const result = CreateSolicitudPrestamoSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Datos inválidos", details: result.error.issues }, { status: 400 });
  }

  const { materiales } = result.data;

  // Validate all requested materials
  const ids = materiales.map((m) => m.materialId);
  const dbMateriales = await prisma.material.findMany({
    where: { id: { in: ids } },
    select: { id: true, nombre: true, cantidad: true, estado: true },
  });

  for (const req of materiales) {
    const db = dbMateriales.find((m) => m.id === req.materialId);
    if (!db) return NextResponse.json({ error: `Material #${req.materialId} no encontrado` }, { status: 400 });
    if (db.estado !== "DISPONIBLE") return NextResponse.json({ error: `"${db.nombre}" no está disponible` }, { status: 400 });
    if (db.cantidad < req.cantidad) {
      return NextResponse.json({ error: `Stock insuficiente para "${db.nombre}". Disponible: ${db.cantidad}` }, { status: 400 });
    }
  }

  const solicitud = await prisma.solicitudPrestamo.create({
    data: {
      usuarioId: usuario.id,
      estado: "PENDIENTE",
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
