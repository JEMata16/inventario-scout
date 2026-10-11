import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// PUT /api/prestamos/[id]/cancelar
// La sección puede cancelar su solicitud mientras esté PENDIENTE o APROBADA
// (antes de retirar el material). El admin puede cancelar cualquiera en esos estados.
// La solicitud se conserva en el historial con estado CANCELADA y libera la reserva.
export async function PUT(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const solicitudId = parseInt(id, 10);
  if (isNaN(solicitudId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const solicitud = await prisma.solicitudPrestamo.findUnique({
    where: { id: solicitudId },
    select: { id: true, estado: true, usuarioId: true },
  });

  if (!solicitud) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && solicitud.usuarioId !== parseInt(session.user.id, 10)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }
  if (solicitud.estado !== "PENDIENTE" && solicitud.estado !== "APROBADA") {
    return NextResponse.json(
      { error: "Solo se pueden cancelar solicitudes pendientes o aprobadas que aún no se han retirado" },
      { status: 400 }
    );
  }

  // updateMany con el estado en el filtro evita cancelar algo que otro usuario acaba de entregar
  const { count } = await prisma.solicitudPrestamo.updateMany({
    where: { id: solicitudId, estado: solicitud.estado },
    data: { estado: "CANCELADA", fechaCancelacion: new Date() },
  });
  if (count === 0) {
    return NextResponse.json({ error: "La solicitud cambió de estado. Actualice la página." }, { status: 409 });
  }

  return NextResponse.json({ message: "Solicitud cancelada" });
}
