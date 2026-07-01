import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UpdateMaterialSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const materialId = parseInt(id, 10);
  if (isNaN(materialId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const existing = await prisma.material.findUnique({ where: { id: materialId } });
  if (!existing) return NextResponse.json({ error: "Material no encontrado" }, { status: 404 });

  const body = await request.json();
  const result = UpdateMaterialSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Datos inválidos", details: result.error.issues }, { status: 400 });
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
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const materialId = parseInt(id, 10);
  if (isNaN(materialId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const existing = await prisma.material.findUnique({
    where: { id: materialId },
    include: { _count: { select: { detallesPrestamo: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Material no encontrado" }, { status: 404 });

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