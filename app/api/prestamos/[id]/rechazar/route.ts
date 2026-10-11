import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RechazarPrestamoSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const solicitudId = parseInt(id, 10);
  if (isNaN(solicitudId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await request.json();
  const result = RechazarPrestamoSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? "Datos inválidos", details: result.error.issues },
      { status: 400 }
    );
  }

  const admin = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });

  const solicitud = await prisma.solicitudPrestamo.findUnique({
    where: { id: solicitudId },
    select: { id: true, estado: true },
  });

  if (!solicitud) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  if (solicitud.estado !== "PENDIENTE") {
    return NextResponse.json({ error: "Solo se pueden rechazar solicitudes pendientes" }, { status: 400 });
  }

  const { count } = await prisma.solicitudPrestamo.updateMany({
    where: { id: solicitudId, estado: "PENDIENTE" },
    data: {
      estado: "RECHAZADA",
      fechaRechazo: new Date(),
      motivoRechazo: result.data.motivo,
      razonRechazo: result.data.razon || null,
      rechazadoPor: admin.id,
    },
  });

  if (count === 0) {
    return NextResponse.json({ error: "La solicitud cambió de estado. Actualice la página." }, { status: 409 });
  }

  return NextResponse.json({ message: "Solicitud rechazada" });
}
