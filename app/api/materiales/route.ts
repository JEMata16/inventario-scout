import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreateMaterialSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const estado = searchParams.get("estado") ?? "";
  const categoria = searchParams.get("categoria") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { nombre: { contains: search } },
      { descripcion: { contains: search } },
      { categoria: { contains: search } },
    ];
  }
  if (estado) where.estado = estado;
  if (categoria) where.categoria = categoria;

  const [rawMateriales, total] = await Promise.all([
    prisma.material.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        usuario: { select: { nombre: true, apellido: true } },
        _count: { select: { detallesPrestamo: true } },
      },
    }),
    prisma.material.count({ where }),
  ]);

  // Strip base64 image data from list response to keep payloads small.
  // Consumers use /api/materiales/{id}/imagen to display images.
  const materiales = rawMateriales.map(({ imagen, ...rest }) => ({
    ...rest,
    hasImagen: !!imagen,
  }));

  return NextResponse.json({
    materiales,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = (session.user as any).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores pueden crear materiales" }, { status: 403 });
  }

  // Resolve real DB id from email — guards against stale JWT ids
  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!usuario) {
    return NextResponse.json(
      { error: "Usuario no encontrado en la base de datos. Ejecute npm run db:seed." },
      { status: 401 }
    );
  }

  const body = await request.json();
  const result = CreateMaterialSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Datos inválidos", details: result.error.issues }, { status: 400 });
  }

  const material = await prisma.material.create({
    data: {
      ...result.data,
      creadoPor: usuario.id,
    },
  });

  return NextResponse.json(material, { status: 201 });
}