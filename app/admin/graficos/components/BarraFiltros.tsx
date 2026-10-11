"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SECCIONES } from "@/lib/constantes";
import { PRESETS, type Preset } from "@/lib/reportes/filtros";
import { hoyCRISO } from "@/lib/fechas";

const REPORTES_CSV = [
  { value: "prestamos", label: "Historial de préstamos" },
  { value: "secciones", label: "Resumen por sección" },
  { value: "materiales", label: "Utilización por material" },
  { value: "danos", label: "Daños y pérdidas" },
];

const controlClass =
  "px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors";

interface Props {
  preset: Preset;
  desde: string;
  hasta: string;
  seccion: string;
  /** Parámetros de la URL actual (sin página), para exportar lo mismo que se ve */
  query: string;
}

export function BarraFiltros({ preset, desde, hasta, seccion, query }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [mostrarFechas, setMostrarFechas] = useState(preset === "personalizado");
  const [desdeLocal, setDesdeLocal] = useState(desde);
  const [hastaLocal, setHastaLocal] = useState(hasta);

  function navegar(cambios: Record<string, string | null>) {
    const params = new URLSearchParams(query);
    for (const [k, v] of Object.entries(cambios)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("pagina"); // cualquier cambio de filtro vuelve a la primera página
    startTransition(() => router.push(`${pathname}?${params}`, { scroll: false }));
  }

  function elegirPreset(p: Preset) {
    if (p === "personalizado") {
      setMostrarFechas(true);
      return;
    }
    setMostrarFechas(false);
    navegar({ periodo: p, desde: null, hasta: null });
  }

  const rangoValido = desdeLocal !== "" && hastaLocal !== "" && desdeLocal <= hastaLocal;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 print:hidden">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        {/* Período */}
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-600 mb-1.5">Período</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
            {PRESETS.map((p) => {
              const activo = p.value === "personalizado" ? mostrarFechas : !mostrarFechas && preset === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => elegirPreset(p.value)}
                  aria-pressed={activo}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    activo
                      ? "bg-green-700 border-green-700 text-white"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          {mostrarFechas && (
            <form
              className="flex flex-wrap items-end gap-2 mt-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (rangoValido) navegar({ periodo: "personalizado", desde: desdeLocal, hasta: hastaLocal });
              }}
            >
              <label className="text-xs text-slate-600">
                Desde
                <input type="date" value={desdeLocal} max={hoyCRISO()} onChange={(e) => setDesdeLocal(e.target.value)} className={`${controlClass} block mt-1`} />
              </label>
              <label className="text-xs text-slate-600">
                Hasta
                <input type="date" value={hastaLocal} min={desdeLocal} onChange={(e) => setHastaLocal(e.target.value)} className={`${controlClass} block mt-1`} />
              </label>
              <button
                type="submit"
                disabled={!rangoValido}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Aplicar
              </button>
              {!rangoValido && desdeLocal && hastaLocal && (
                <span className="text-xs text-red-600">La fecha final debe ser igual o posterior a la inicial.</span>
              )}
            </form>
          )}
        </div>

        {/* Sección */}
        <label className="text-xs font-medium text-slate-600">
          Sección
          <select
            value={seccion}
            onChange={(e) => navegar({ seccion: e.target.value || null })}
            className={`${controlClass} block mt-1.5 min-w-40 cursor-pointer`}
          >
            <option value="">Todas las secciones</option>
            {SECCIONES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <details className="relative">
            <summary className="list-none px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer select-none">
              Exportar CSV ▾
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
              {REPORTES_CSV.map((r) => (
                <a
                  key={r.value}
                  href={`/api/reportes/${r.value}?${query}`}
                  className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  download
                >
                  {r.label}
                </a>
              ))}
            </div>
          </details>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Imprimir / PDF
          </button>
        </div>
      </div>
      {isPending && <p className="text-xs text-slate-500 mt-3" role="status">Actualizando reporte...</p>}
    </div>
  );
}
