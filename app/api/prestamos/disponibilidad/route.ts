import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calcularDisponibilidad, validarRangoPrestamo } from "@/lib/disponibilidad";
import { esFechaValida, parseFecha } from "@/lib/fechas";

// GET /api/prestamos/disponibilidad?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Disponibilidad de todos los materiales prestables para un rango de fechas,
// con las solicitudes pendientes de otras secciones que compiten por ellos.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const desdeStr = searchParams.get("desde") ?? "";
  const hastaStr = searchParams.get("hasta") ?? "";
  if (!esFechaValida(desdeStr) || !esFechaValida(hastaStr)) {
    return NextResponse.json({ error: "Indique fechas válidas" }, { status: 400 });
  }

  const desde = parseFecha(desdeStr);
  const hasta = parseFecha(hastaStr);
  const errorRango = validarRangoPrestamo(desde, hasta);
  if (errorRango) return NextResponse.json({ error: errorRango }, { status: 400 });

  const materiales = await prisma.material.findMany({
    where: { estado: "DISPONIBLE" },
    select: { id: true, nombre: true, categoria: true },
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
  });

  const disponibilidad = await calcularDisponibilidad(
    prisma,
    materiales.map((m) => m.id),
    desde,
    hasta,
    { conPendientes: true }
  );

  const userId = parseInt(session.user.id, 10);
  const propias = new Set(
    (
      await prisma.solicitudPrestamo.findMany({
        where: { usuarioId: userId, estado: "PENDIENTE" },
        select: { id: true },
      })
    ).map((s) => s.id)
  );

  return NextResponse.json({
    materiales: materiales.map((m) => {
      const d = disponibilidad.get(m.id)!;
      return {
        id: m.id,
        nombre: m.nombre,
        categoria: m.categoria,
        disponible: d.disponible,
        disponibleConPendientes: d.disponibleConPendientes,
        pendientes: d.pendientes.map((p) => ({ ...p, propia: propias.has(p.solicitudId) })),
      };
    }),
  });
}
