import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DevolverPrestamoSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

class ErrorDevolucion extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// PUT /api/prestamos/[id]/devolver
// El admin registra la devolución revisando cada material:
// - las unidades dañadas pasan a mantenimiento (cantidadMantenimiento += dañadas)
// - las unidades faltantes se descuentan del inventario (cantidadTotal -= faltantes)
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const solicitudId = parseInt(id, 10);
  if (isNaN(solicitudId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const result = DevolverPrestamoSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
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
        include: { detalles: { include: { material: { select: { nombre: true } } } } },
      });
      if (!solicitud) throw new ErrorDevolucion("Solicitud no encontrada", 404);
      if (solicitud.estado !== "ENTREGADA") {
        throw new ErrorDevolucion("Solo se pueden registrar devoluciones de préstamos entregados");
      }

      const revision = new Map(result.data.detalles.map((d) => [d.detalleId, d]));
      for (const detalleId of revision.keys()) {
        if (!solicitud.detalles.some((d) => d.id === detalleId)) {
          throw new ErrorDevolucion("La revisión incluye un material que no pertenece a esta solicitud");
        }
      }

      for (const detalle of solicitud.detalles) {
        const r = revision.get(detalle.id);
        const danada = r?.cantidadDanada ?? 0;
        const faltante = r?.cantidadFaltante ?? 0;
        if (danada + faltante > detalle.cantidad) {
          throw new ErrorDevolucion(
            `"${detalle.material.nombre}": dañadas + faltantes no puede superar las ${detalle.cantidad} unidades prestadas`
          );
        }

        await tx.detallePrestamo.update({
          where: { id: detalle.id },
          data: { cantidadDanada: danada, cantidadFaltante: faltante, observaciones: r?.observaciones || null },
        });

        if (danada > 0 || faltante > 0) {
          await tx.material.update({
            where: { id: detalle.materialId },
            data: {
              cantidadMantenimiento: { increment: danada },
              cantidadTotal: { decrement: faltante },
            },
          });
        }
      }

      const { count } = await tx.solicitudPrestamo.updateMany({
        where: { id: solicitudId, estado: "ENTREGADA" },
        data: {
          estado: "DEVUELTA",
          fechaDevolucionReal: new Date(),
          recibidoPor: admin.id,
          observacionesDevolucion: result.data.observaciones || null,
        },
      });
      if (count === 0) throw new ErrorDevolucion("La solicitud cambió de estado. Actualice la página.", 409);

      return tx.solicitudPrestamo.findUnique({ where: { id: solicitudId } });
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ErrorDevolucion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error al registrar devolución:", error);
    return NextResponse.json({ error: "Error al registrar la devolución" }, { status: 500 });
  }
}
