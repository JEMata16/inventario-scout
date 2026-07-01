import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const solicitudId = parseInt(id, 10);
  if (isNaN(solicitudId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const role = (session.user as any).role;
  const userId = parseInt(session.user.id, 10);

  const solicitud = await prisma.solicitudPrestamo.findUnique({
    where: { id: solicitudId },
    include: {
      usuario: { select: { nombre: true, apellido: true, email: true } },
      detalles: {
        include: {
          material: { select: { nombre: true, categoria: true, cantidad: true } },
        },
      },
    },
  });

  if (!solicitud) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  if (role !== "ADMIN" && solicitud.usuarioId !== userId) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  return NextResponse.json(solicitud);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const solicitudId = parseInt(id, 10);
  if (isNaN(solicitudId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });

  const solicitud = await prisma.solicitudPrestamo.findUnique({
    where: { id: solicitudId },
    select: { id: true, estado: true, usuarioId: true },
  });

  if (!solicitud) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  if (solicitud.usuarioId !== usuario.id) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  if (solicitud.estado !== "PENDIENTE") {
    return NextResponse.json({ error: "Solo se pueden cancelar solicitudes pendientes" }, { status: 400 });
  }

  await prisma.solicitudPrestamo.delete({ where: { id: solicitudId } });
  return NextResponse.json({ message: "Solicitud cancelada" });
}
