import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import { AdminNavBar } from "@/components/layout/AdminNavBar";
import { etiquetaSeccion } from "@/lib/constantes";
import { aISO, formatFecha, formatFechaHora } from "@/lib/fechas";
import { filtrosAParams, parseFiltros, type FiltrosReporte } from "@/lib/reportes/filtros";
import { obtenerFranjaOperativa, obtenerHistorial, obtenerReporte } from "@/lib/reportes/consultas";
import { BarraFiltros } from "./components/BarraFiltros";
import { FranjaOperativa } from "./components/FranjaOperativa";
import { Indicadores } from "./components/Indicadores";
import { GraficoSolicitudes } from "./components/GraficoSolicitudes";
import { GraficoBarras } from "./components/GraficoBarras";
import { TablaDanos, TablaHistorial, TablaSecciones, TablaUtilizacion } from "./components/Tablas";
import { SinDatos, Tarjeta } from "./components/Tarjeta";

export const metadata: Metadata = {
  title: "Reportes y Análisis | Scout Inventario",
  description: "Análisis de préstamos, uso del inventario y secciones",
};

const NOMBRE_GRANULARIDAD = { dia: "por día", semana: "por semana", mes: "por mes" } as const;

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard/usuario");

  const filtros = parseFiltros(await searchParams);
  const query = filtrosAParams(filtros).toString();
  const descripcionPeriodo = `${formatFecha(filtros.desde)} – ${formatFecha(filtros.hasta)}`;
  const descripcionSeccion = filtros.seccion ? etiquetaSeccion(filtros.seccion) : "Todas las secciones";

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="print:hidden">
        <AdminNavBar />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 print:p-0 print:max-w-none">
        {/* Encabezado de pantalla */}
        <div className="mb-6 print:hidden">
          <h1 className="text-2xl font-bold text-slate-900">Reportes y Análisis</h1>
          <p className="text-sm text-slate-500 mt-1">
            {descripcionPeriodo} · {descripcionSeccion}
          </p>
        </div>

        {/* Encabezado del informe impreso */}
        <div className="hidden print:block mb-4 border-b border-slate-300 pb-2">
          <p className="text-xs text-slate-500">Grupo de Guías y Scouts #3 de la Sabana · Sistema de Inventario</p>
          <h1 className="text-xl font-bold text-slate-900">Reporte de préstamos e inventario</h1>
          <p className="text-sm text-slate-700">
            Período: {descripcionPeriodo} · {descripcionSeccion} · Generado el {formatFechaHora(new Date())}
          </p>
        </div>

        {/* key: reinicia el estado local del formulario cuando cambia la URL */}
        <BarraFiltros
          key={`filtros|${query}`}
          preset={filtros.preset}
          desde={aISO(filtros.desde)}
          hasta={aISO(filtros.hasta)}
          seccion={filtros.seccion ?? ""}
          query={query}
        />

        <Suspense fallback={<EsqueletoFranja />}>
          <FranjaOperativaAsync />
        </Suspense>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 print:hidden">Período seleccionado</p>
        <Suspense key={`reporte|${query}`} fallback={<EsqueletoReporte />}>
          <ReporteAsync filtros={filtros} />
        </Suspense>

        <Suspense key={`historial|${query}|${filtros.pagina}`} fallback={<EsqueletoBloque alto="h-64" />}>
          <HistorialAsync filtros={filtros} query={query} />
        </Suspense>
      </main>
    </div>
  );
}

// ── Bloques con datos ───────────────────────────────────────────────────────

async function FranjaOperativaAsync() {
  return <FranjaOperativa datos={await obtenerFranjaOperativa()} />;
}

async function ReporteAsync({ filtros }: { filtros: FiltrosReporte }) {
  const r = await obtenerReporte(filtros);
  const top = r.materialesPrestados.slice(0, 10);

  return (
    <>
      <Indicadores datos={r.indicadores} />

      <div className="space-y-6 mb-6">
        <Tarjeta
          titulo="Solicitudes en el tiempo"
          descripcion={`Solicitudes recibidas ${NOMBRE_GRANULARIDAD[r.granularidad]}, por sección`}
        >
          {r.indicadores.recibidas === 0 ? (
            <SinDatos>No se recibieron solicitudes en este período.</SinDatos>
          ) : (
            <GraficoSolicitudes datos={r.serie} secciones={r.secciones} />
          )}
        </Tarjeta>

        <Tarjeta titulo="Resumen por sección" descripcion="¿Qué sección necesita seguimiento?">
          <TablaSecciones filas={r.resumenSecciones} />
        </Tarjeta>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
          <Tarjeta titulo="Materiales más prestados" descripcion="Unidades en préstamos aprobados, entregados o devueltos cuyo uso cae en el período">
            {top.length === 0 ? (
              <SinDatos>No hubo préstamos en uso durante este período.</SinDatos>
            ) : (
              <GraficoBarras datos={top.map((m) => ({ etiqueta: m.nombre, valor: m.unidades }))} unidad={["unidad", "unidades"]} />
            )}
          </Tarjeta>

          <Tarjeta titulo="Motivos de rechazo" descripcion="Solicitudes rechazadas en el período, por motivo">
            {r.motivosRechazo.length === 0 ? (
              <SinDatos>No hubo rechazos en este período.</SinDatos>
            ) : (
              <GraficoBarras datos={r.motivosRechazo.map((m) => ({ etiqueta: m.etiqueta, valor: m.cantidad }))} unidad={["solicitud", "solicitudes"]} />
            )}
          </Tarjeta>
        </div>

        <Tarjeta partible titulo="Utilización y escasez por material" descripcion="¿Qué conviene comprar y qué está ocioso?">
          <TablaUtilizacion filas={r.utilizacion} filtradoPorSeccion={filtros.seccion !== null} />
        </Tarjeta>

        <Tarjeta partible titulo="Daños y pérdidas" descripcion="Registrados al recibir las devoluciones del período">
          <TablaDanos filas={r.danos} />
        </Tarjeta>
      </div>
    </>
  );
}

async function HistorialAsync({ filtros, query }: { filtros: FiltrosReporte; query: string }) {
  const h = await obtenerHistorial(filtros);
  return (
    <Tarjeta partible titulo="Historial de préstamos" descripcion="Solicitudes hechas en el período, de la más reciente a la más antigua">
      <TablaHistorial
        filas={h.filas}
        total={h.total}
        pagina={h.pagina}
        totalPaginas={h.totalPaginas}
        hrefPagina={(p) => `/admin/graficos?${query}${p > 1 ? `&pagina=${p}` : ""}`}
      />
    </Tarjeta>
  );
}

// ── Esqueletos de carga ─────────────────────────────────────────────────────

function EsqueletoBloque({ alto }: { alto: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-1/4 mb-4" />
      <div className={`${alto} bg-slate-100 rounded`} />
    </div>
  );
}

function EsqueletoFranja() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6 mt-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
      ))}
    </div>
  );
}

function EsqueletoReporte() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />
        ))}
      </div>
      <EsqueletoBloque alto="h-64" />
      <EsqueletoBloque alto="h-40" />
    </>
  );
}
