import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calcularDisponibilidad } from "@/lib/disponibilidad";

type Params = { params: Promise<{ id: string }> };

// GET /api/prestamos/[id]
// Para el admin incluye `analisis`: disponibilidad de cada material en las
// fechas de la solicitud y las solicitudes pendientes que compiten por él.
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const solicitudId = parseInt(id, 10);
  if (isNaN(solicitudId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const role = session.user.role;
  const userId = parseInt(session.user.id, 10);

  const solicitud = await prisma.solicitudPrestamo.findUnique({
    where: { id: solicitudId },
    include: {
      usuario: { select: { nombre: true, seccion: true, email: true } },
      usuarioAprobador: { select: { nombre: true } },
      usuarioEntrega: { select: { nombre: true } },
      usuarioRecepcion: { select: { nombre: true } },
      detalles: {
        include: {
          material: { select: { nombre: true, categoria: true } },
        },
      },
    },
  });

  if (!solicitud) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  if (role !== "ADMIN" && solicitud.usuarioId !== userId) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  let analisis = null;
  if (role === "ADMIN" && solicitud.estado === "PENDIENTE") {
    const disp = await calcularDisponibilidad(
      prisma,
      solicitud.detalles.map((d) => d.materialId),
      solicitud.fechaRetiro,
      solicitud.fechaDevolucionEsperada,
      { excluirSolicitudId: solicitud.id, conPendientes: true }
    );
    analisis = solicitud.detalles.map((d) => {
      const m = disp.get(d.materialId)!;
      return {
        detalleId: d.id,
        materialId: d.materialId,
        solicitado: d.cantidad,
        disponible: m.disponible,
        cantidadTotal: m.cantidadTotal,
        cantidadMantenimiento: m.cantidadMantenimiento,
        reservado: m.reservado,
        estadoMaterial: m.estado,
        suficiente: m.disponible >= d.cantidad,
        pendientes: m.pendientes,
      };
    });
  }

  return NextResponse.json({ ...solicitud, analisis });
}
