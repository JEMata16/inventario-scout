import Link from "next/link";
import { COLOR_SECCION, ESTADO_SOLICITUD_CONFIG, etiquetaMotivoRechazo, type EstadoSolicitud } from "@/lib/constantes";
import { formatFecha, formatFechaHora, formatRango } from "@/lib/fechas";
import type { DanoPerdida, FilaHistorial, ResumenSeccion, UtilizacionMaterial } from "@/lib/reportes/consultas";
import { SinDatos } from "./Tarjeta";

const th = "text-left px-3 py-2 font-medium text-slate-600 whitespace-nowrap";
const thNum = "text-right px-3 py-2 font-medium text-slate-600 whitespace-nowrap";
const td = "px-3 py-2 text-slate-700";
const tdNum = "px-3 py-2 text-right tabular-nums text-slate-900";

function Porcentaje({ valor }: { valor: number | null }) {
  return <>{valor === null ? <span className="text-slate-400">—</span> : `${valor}%`}</>;
}

// ── Resumen por sección ─────────────────────────────────────────────────────

export function TablaSecciones({ filas }: { filas: ResumenSeccion[] }) {
  if (filas.every((f) => f.solicitudes === 0 && f.devoluciones === 0)) return <SinDatos />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm print:text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className={th}>Sección</th>
            <th className={thNum}>Solicitudes</th>
            <th className={thNum}>Aprobadas</th>
            <th className={thNum}>Rechazadas</th>
            <th className={thNum}>Canceladas</th>
            <th className={thNum}>Devoluciones</th>
            <th className={thNum}>A tiempo</th>
            <th className={thNum}>Dañadas</th>
            <th className={thNum}>Perdidas</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.seccion} className="border-b border-slate-100">
              <td className={`${td} font-medium text-slate-900`}>
                <span className="inline-flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR_SECCION[f.seccion] }} aria-hidden="true" />
                  {f.nombre}
                </span>
              </td>
              <td className={tdNum}>{f.solicitudes}</td>
              <td className={tdNum}>{f.aprobadas}</td>
              <td className={tdNum}>{f.rechazadas}</td>
              <td className={tdNum}>{f.canceladas}</td>
              <td className={tdNum}>{f.devoluciones}</td>
              <td className={`${tdNum} ${f.tasaATiempo !== null && f.tasaATiempo < 80 ? "text-red-700 font-semibold" : ""}`}>
                <Porcentaje valor={f.tasaATiempo} />
              </td>
              <td className={`${tdNum} ${f.danadas > 0 ? "text-amber-700 font-semibold" : ""}`}>{f.danadas}</td>
              <td className={`${tdNum} ${f.perdidas > 0 ? "text-red-700 font-semibold" : ""}`}>{f.perdidas}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-400 mt-2">
        Las solicitudes cuentan por fecha de solicitud; las devoluciones, daños y pérdidas, por fecha de devolución.
        Se resalta cuando menos del 80% se devolvió a tiempo.
      </p>
    </div>
  );
}

// ── Utilización y escasez ───────────────────────────────────────────────────

const UMBRAL_ESCASO = 70;

export function TablaUtilizacion({ filas, filtradoPorSeccion }: { filas: UtilizacionMaterial[]; filtradoPorSeccion: boolean }) {
  if (filas.length === 0) return <SinDatos>No hay materiales registrados.</SinDatos>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm print:text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className={th}>Material</th>
            <th className={thNum}>Unidades</th>
            <th className={`${th} w-1/3`}>Utilización</th>
            <th className={thNum} title="Solicitudes rechazadas por Sin stock o Conflicto">Rechazos por stock</th>
            <th className={th}>Lectura</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((m) => {
            const escaso = m.rechazosPorStock > 0 || (m.porcentaje ?? 0) >= UMBRAL_ESCASO;
            const ocioso = !escaso && m.porcentaje === 0;
            return (
              <tr key={m.id} className="border-b border-slate-100">
                <td className={td}>
                  <span className="font-medium text-slate-900">{m.nombre}</span>
                  {m.categoria && <span className="block text-xs text-slate-400">{m.categoria}</span>}
                </td>
                <td className={tdNum}>{m.unidadesUtilizables}</td>
                <td className="px-3 py-2">
                  {m.porcentaje === null ? (
                    <span className="text-xs text-slate-400">Sin unidades utilizables</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                        <div className="h-full rounded-full" style={{ width: `${m.porcentaje}%`, backgroundColor: "#2a78d6" }} />
                      </div>
                      <span className="w-10 text-right tabular-nums text-slate-900">{m.porcentaje}%</span>
                    </div>
                  )}
                </td>
                <td className={`${tdNum} ${m.rechazosPorStock > 0 ? "text-red-700 font-semibold" : ""}`}>{m.rechazosPorStock}</td>
                <td className={td}>
                  {escaso ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                      <span aria-hidden="true">▲</span> Escaso
                    </span>
                  ) : ocioso ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      <span aria-hidden="true">○</span> Ocioso
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-slate-400 mt-2">
        Utilización = unidades·día prestadas ÷ (unidades utilizables × días del período)
        {filtradoPorSeccion && ", solo con los préstamos de la sección filtrada"}. Usa la cantidad actual de cada
        material: si el inventario cambió durante el período, el porcentaje es aproximado. «Escaso» = hubo rechazos por
        falta de stock o la utilización fue de {UMBRAL_ESCASO}% o más: conviene valorar una compra.
      </p>
    </div>
  );
}

// ── Daños y pérdidas ────────────────────────────────────────────────────────

export function TablaDanos({ filas }: { filas: DanoPerdida[] }) {
  if (filas.length === 0) return <SinDatos>No se registraron daños ni pérdidas en las devoluciones del período.</SinDatos>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm print:text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className={th}>Devuelto</th>
            <th className={th}>Sección</th>
            <th className={th}>Material</th>
            <th className={thNum}>Dañadas</th>
            <th className={thNum}>Perdidas</th>
            <th className={th}>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((d, i) => (
            <tr key={`${d.solicitudId}-${i}`} className="border-b border-slate-100">
              <td className={`${td} whitespace-nowrap`}>
                {formatFechaHora(d.fechaDevolucion)}
                <span className="block text-xs text-slate-400 font-mono">#{d.solicitudId}</span>
              </td>
              <td className={td}>
                {d.seccion}
                <span className="block text-xs text-slate-400">{d.responsable}</span>
              </td>
              <td className={`${td} font-medium text-slate-900`}>{d.material}</td>
              <td className={tdNum}>{d.danadas}</td>
              <td className={tdNum}>{d.perdidas}</td>
              <td className={`${td} text-xs`}>{d.observaciones ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Historial ───────────────────────────────────────────────────────────────

export function TablaHistorial({
  filas,
  total,
  pagina,
  totalPaginas,
  hrefPagina,
}: {
  filas: FilaHistorial[];
  total: number;
  pagina: number;
  totalPaginas: number;
  hrefPagina: (p: number) => string;
}) {
  if (total === 0) return <SinDatos>No hay solicitudes en este período.</SinDatos>;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm print:text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className={th}>#</th>
              <th className={th}>Sección</th>
              <th className={th}>Materiales</th>
              <th className={th}>Uso</th>
              <th className={th}>Solicitada</th>
              <th className={th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const cfg = ESTADO_SOLICITUD_CONFIG[f.estado as EstadoSolicitud];
              return (
                <tr key={f.id} className="border-b border-slate-100 align-top">
                  <td className={`${td} text-xs text-slate-400 font-mono`}>#{f.id}</td>
                  <td className={td}>
                    <span className="font-medium text-slate-900">{f.seccion}</span>
                    <span className="block text-xs text-slate-400">{f.responsable}</span>
                  </td>
                  <td className={`${td} text-xs`}>
                    {f.actividad && <span className="block font-medium text-slate-700">{f.actividad}</span>}
                    {f.materiales}
                  </td>
                  <td className={`${td} text-xs whitespace-nowrap`}>{formatRango(f.fechaRetiro, f.fechaDevolucionEsperada)}</td>
                  <td className={`${td} text-xs whitespace-nowrap`}>{formatFechaHora(f.fechaSolicitud)}</td>
                  <td className={td}>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cfg?.badge ?? "bg-slate-100 text-slate-600"}`}>
                      {cfg?.label ?? f.estado}
                    </span>
                    {f.estado === "RECHAZADA" && (
                      <span className="block text-xs text-slate-500 mt-0.5">{etiquetaMotivoRechazo(f.motivoRechazo)}</span>
                    )}
                    {f.fechaDevolucionReal && (
                      <span className="block text-xs text-slate-500 mt-0.5">Devuelta {formatFecha(f.fechaDevolucionReal)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
        <p>
          {total} solicitud{total === 1 ? "" : "es"} en el período
          <span className="hidden print:inline"> · página {pagina} de {totalPaginas} (el CSV incluye todas)</span>
        </p>
        {totalPaginas > 1 && (
          <nav className="flex items-center gap-1 print:hidden" aria-label="Paginación del historial">
            {pagina > 1 ? (
              <Link href={hrefPagina(pagina - 1)} scroll={false} className="px-2 py-1 rounded-md hover:bg-slate-100 text-slate-700">← Anterior</Link>
            ) : (
              <span className="px-2 py-1 text-slate-300">← Anterior</span>
            )}
            <span className="px-2">{pagina} / {totalPaginas}</span>
            {pagina < totalPaginas ? (
              <Link href={hrefPagina(pagina + 1)} scroll={false} className="px-2 py-1 rounded-md hover:bg-slate-100 text-slate-700">Siguiente →</Link>
            ) : (
              <span className="px-2 py-1 text-slate-300">Siguiente →</span>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
