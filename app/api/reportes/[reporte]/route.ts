import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ESTADO_SOLICITUD_CONFIG, etiquetaMotivoRechazo, type EstadoSolicitud } from "@/lib/constantes";
import { aISO, formatFecha, formatFechaHora } from "@/lib/fechas";
import { parseFiltros } from "@/lib/reportes/filtros";
import { generarCSV } from "@/lib/reportes/calculos";
import { obtenerHistorial, obtenerReporte } from "@/lib/reportes/consultas";

type Params = { params: Promise<{ reporte: string }> };

const REPORTES = ["prestamos", "secciones", "materiales", "danos"] as const;
type TipoReporte = (typeof REPORTES)[number];

// GET /api/reportes/{prestamos|secciones|materiales|danos}?periodo=...&desde=...&hasta=...&seccion=...
// Mismos parámetros que /admin/graficos: lo exportado coincide con lo que se ve.
export async function GET(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { reporte } = await params;
  if (!REPORTES.includes(reporte as TipoReporte)) {
    return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
  }

  const filtros = parseFiltros(Object.fromEntries(new URL(request.url).searchParams));
  const csv = await generar(reporte as TipoReporte, filtros);

  const sufijo = `${aISO(filtros.desde)}_a_${aISO(filtros.hasta)}${filtros.seccion ? `_${filtros.seccion.toLowerCase()}` : ""}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-${reporte}_${sufijo}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

async function generar(reporte: TipoReporte, filtros: ReturnType<typeof parseFiltros>): Promise<string> {
  if (reporte === "prestamos") {
    const { filas } = await obtenerHistorial(filtros, { todos: true });
    return generarCSV(
      ["Solicitud", "Sección", "Responsable", "Actividad", "Fecha de solicitud", "Retiro", "Devolución esperada", "Devolución real", "Estado", "Motivo de rechazo", "Materiales"],
      filas.map((f) => [
        f.id,
        f.seccion,
        f.responsable,
        f.actividad,
        formatFechaHora(f.fechaSolicitud),
        formatFecha(f.fechaRetiro),
        formatFecha(f.fechaDevolucionEsperada),
        f.fechaDevolucionReal ? formatFechaHora(f.fechaDevolucionReal) : "",
        ESTADO_SOLICITUD_CONFIG[f.estado as EstadoSolicitud]?.label ?? f.estado,
        f.estado === "RECHAZADA" ? etiquetaMotivoRechazo(f.motivoRechazo) : "",
        f.materiales,
      ])
    );
  }

  const r = await obtenerReporte(filtros);

  if (reporte === "secciones") {
    return generarCSV(
      ["Sección", "Solicitudes", "Aprobadas", "Rechazadas", "Canceladas", "Pendientes", "Devoluciones", "% a tiempo", "Unidades dañadas", "Unidades perdidas"],
      r.resumenSecciones.map((s) => [
        s.nombre, s.solicitudes, s.aprobadas, s.rechazadas, s.canceladas, s.pendientes, s.devoluciones, s.tasaATiempo, s.danadas, s.perdidas,
      ])
    );
  }

  if (reporte === "materiales") {
    const prestados = new Map(r.materialesPrestados.map((m) => [m.id, m]));
    return generarCSV(
      ["Material", "Categoría", "Unidades utilizables", "% utilización", "Rechazos por falta de stock", "Unidades prestadas", "Préstamos"],
      r.utilizacion.map((m) => [
        m.nombre,
        m.categoria,
        m.unidadesUtilizables,
        m.porcentaje,
        m.rechazosPorStock,
        prestados.get(m.id)?.unidades ?? 0,
        prestados.get(m.id)?.prestamos ?? 0,
      ])
    );
  }

  return generarCSV(
    ["Solicitud", "Fecha de devolución", "Sección", "Responsable", "Material", "Unidades dañadas", "Unidades perdidas", "Observaciones"],
    r.danos.map((d) => [d.solicitudId, formatFechaHora(d.fechaDevolucion), d.seccion, d.responsable, d.material, d.danadas, d.perdidas, d.observaciones])
  );
}
