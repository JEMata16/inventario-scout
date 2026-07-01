import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AprobarPrestamoSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const solicitudId = parseInt(id, 10);
  if (isNaN(solicitudId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await request.json();
  const result = AprobarPrestamoSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Datos inválidos", details: result.error.issues }, { status: 400 });
  }

  const admin = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });

  const solicitud = await prisma.solicitudPrestamo.findUnique({
    where: { id: solicitudId },
    include: { detalles: { select: { materialId: true, cantidad: true } } },
  });

  if (!solicitud) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  if (solicitud.estado !== "PENDIENTE") {
    return NextResponse.json({ error: "Solo se pueden aprobar solicitudes pendientes" }, { status: 400 });
  }

  // Verify stock is still sufficient before approving
  const materialIds = solicitud.detalles.map((d) => d.materialId);
  const materiales = await prisma.material.findMany({
    where: { id: { in: materialIds } },
    select: { id: true, nombre: true, cantidad: true, estado: true },
  });

  for (const detalle of solicitud.detalles) {
    const mat = materiales.find((m) => m.id === detalle.materialId);
    if (!mat) return NextResponse.json({ error: "Material no encontrado" }, { status: 400 });
    if (mat.estado !== "DISPONIBLE") return NextResponse.json({ error: `"${mat.nombre}" ya no está disponible` }, { status: 400 });
    if (mat.cantidad < detalle.cantidad) {
      return NextResponse.json({ error: `Stock insuficiente para "${mat.nombre}". Disponible: ${mat.cantidad}` }, { status: 400 });
    }
  }

  // Approve + decrement quantities atomically
  const updated = await prisma.$transaction(async (tx) => {
    const loan = await tx.solicitudPrestamo.update({
      where: { id: solicitudId },
      data: {
        estado: "APROBADA",
        fechaAprobacion: new Date(),
        fechaDevolucionEsperada: new Date(result.data.fechaDevolucionEsperada),
        aceptadoPor: admin.id,
      },
    });
    for (const detalle of solicitud.detalles) {
      await tx.material.update({
        where: { id: detalle.materialId },
        data: { cantidad: { decrement: detalle.cantidad } },
      });
    }
    return loan;
  });

  return NextResponse.json(updated);
}
