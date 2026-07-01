import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PUT(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const solicitudId = parseInt(id, 10);
  if (isNaN(solicitudId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const solicitud = await prisma.solicitudPrestamo.findUnique({
    where: { id: solicitudId },
    include: { detalles: { select: { materialId: true, cantidad: true } } },
  });

  if (!solicitud) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  if (solicitud.estado !== "APROBADA") {
    return NextResponse.json({ error: "Solo se pueden marcar como devueltas las solicitudes aprobadas" }, { status: 400 });
  }

  // Mark returned + restore material quantities atomically
  const updated = await prisma.$transaction(async (tx) => {
    const loan = await tx.solicitudPrestamo.update({
      where: { id: solicitudId },
      data: {
        estado: "DEVUELTO",
        fechaDevolucionReal: new Date(),
      },
    });
    for (const detalle of solicitud.detalles) {
      await tx.material.update({
        where: { id: detalle.materialId },
        data: { cantidad: { increment: detalle.cantidad } },
      });
    }
    return loan;
  });

  return NextResponse.json(updated);
}
