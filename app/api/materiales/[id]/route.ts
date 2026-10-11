import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateMaterialSchema } from "@/lib/validations";
import { comprometidoDesdeHoy } from "@/lib/disponibilidad";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const materialId = parseInt(id, 10);
  if (isNaN(materialId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) return NextResponse.json({ error: "Material no encontrado" }, { status: 404 });

  return NextResponse.json(material);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const materialId = parseInt(id, 10);
  if (isNaN(materialId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const existing = await prisma.material.findUnique({ where: { id: materialId } });
  if (!existing) return NextResponse.json({ error: "Material no encontrado" }, { status: 404 });

  const body = await request.json();
  const result = UpdateMaterialSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? "Datos inválidos", details: result.error.issues },
      { status: 400 }
    );
  }

  const cantidadTotal = result.data.cantidadTotal ?? existing.cantidadTotal;
  const cantidadMantenimiento = result.data.cantidadMantenimiento ?? existing.cantidadMantenimiento;
  if (cantidadMantenimiento > cantidadTotal) {
    return NextResponse.json({ error: "No puede haber más unidades en mantenimiento que el total" }, { status: 400 });
  }

  // No dejar el inventario por debajo de lo ya prometido a las secciones
  const reduceUtilizables = cantidadTotal - cantidadMantenimiento < existing.cantidadTotal - existing.cantidadMantenimiento;
  if (reduceUtilizables) {
    const comprometido = await comprometidoDesdeHoy(prisma, materialId);
    if (cantidadTotal - cantidadMantenimiento < comprometido) {
      return NextResponse.json(
        {
          error: `Hay ${comprometido} unidad${comprometido === 1 ? "" : "es"} comprometida${comprometido === 1 ? "" : "s"} en préstamos aprobados o entregados. Las unidades utilizables (total − mantenimiento) no pueden ser menos que eso.`,
        },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.material.update({
    where: { id: materialId },
    data: result.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const materialId = parseInt(id, 10);
  if (isNaN(materialId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const existing = await prisma.material.findUnique({
    where: { id: materialId },
    include: { _count: { select: { detallesPrestamo: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Material no encontrado" }, { status: 404 });

  if (await comprometidoDesdeHoy(prisma, materialId) > 0) {
    return NextResponse.json(
      { error: "Este material tiene préstamos aprobados o entregados. Espere a que se devuelvan o cancélelos antes de eliminarlo." },
      { status: 400 }
    );
  }

  if (existing._count.detallesPrestamo > 0) {
    // Soft delete: mark as unavailable instead of deleting
    const updated = await prisma.material.update({
      where: { id: materialId },
      data: { estado: "NO_DISPONIBLE" },
    });
    return NextResponse.json({ message: "Material marcado como no disponible", material: updated });
  }

  await prisma.material.delete({ where: { id: materialId } });
  return NextResponse.json({ message: "Material eliminado" });
}