import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const materialId = parseInt(id, 10);
  if (isNaN(materialId)) return new NextResponse(null, { status: 400 });

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { imagen: true },
  });

  if (!material?.imagen) return new NextResponse(null, { status: 404 });

  // Parse "data:<mime>;base64,<data>" stored by the upload route
  const match = material.imagen.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return new NextResponse(null, { status: 422 });

  const [, mimeType, base64Data] = match;
  const buffer = Buffer.from(base64Data, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
