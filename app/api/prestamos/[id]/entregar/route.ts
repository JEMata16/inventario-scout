import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hoyCR } from "@/lib/fechas";

type Params = { params: Promise<{ id: string }> };

// PUT /api/prestamos/[id]/entregar — el admin confirma que la sección retiró el material
export async function PUT(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const solicitudId = parseInt(id, 10);
  if (isNaN(solicitudId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const admin = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });

  const solicitud = await prisma.solicitudPrestamo.findUnique({
    where: { id: solicitudId },
    select: { id: true, estado: true, fechaRetiro: true },
  });

  if (!solicitud) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  if (solicitud.estado !== "APROBADA") {
    return NextResponse.json({ error: "Solo se pueden entregar solicitudes aprobadas" }, { status: 400 });
  }
  // Entregar antes de la fecha de retiro podría chocar con otro préstamo
  // que tiene esas unidades reservadas hasta ese día.
  if (solicitud.fechaRetiro > hoyCR()) {
    return NextResponse.json(
      { error: "El material no se puede entregar antes de la fecha de retiro aprobada" },
      { status: 400 }
    );
  }

  const { count } = await prisma.solicitudPrestamo.updateMany({
    where: { id: solicitudId, estado: "APROBADA" },
    data: { estado: "ENTREGADA", fechaEntrega: new Date(), entregadoPor: admin.id },
  });
  if (count === 0) {
    return NextResponse.json({ error: "La solicitud cambió de estado. Actualice la página." }, { status: 409 });
  }

  return NextResponse.json({ message: "Entrega registrada" });
}
