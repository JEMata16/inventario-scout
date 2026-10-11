// Filtros de los reportes de análisis. Los usan la página /admin/graficos y las
// rutas CSV (/api/reportes/...), así lo que se ve, se imprime y se exporta coincide.

import { SECCIONES, type Seccion } from "../constantes";
import { aISO, diferenciaDias, esFechaValida, hoyCRISO, parseFecha, sumarDias } from "../fechas";

export const PRESETS = [
  { value: "mes", label: "Este mes" },
  { value: "3meses", label: "Últimos 3 meses" },
  { value: "anio", label: "Este año" },
  { value: "personalizado", label: "Personalizado" },
] as const;

export type Preset = (typeof PRESETS)[number]["value"];

export const PRESET_DEFECTO: Preset = "3meses";
export const MAX_DIAS_REPORTE = 731; // dos años

export interface FiltrosReporte {
  preset: Preset;
  /** Primer día del período (medianoche UTC del día de calendario) */
  desde: Date;
  /** Último día del período, inclusive */
  hasta: Date;
  seccion: Seccion | null;
  /** Página del historial (1..n) */
  pagina: number;
}

type Params = Record<string, string | string[] | undefined>;

function valor(params: Params, clave: string): string {
  const v = params[clave];
  return typeof v === "string" ? v : "";
}

function rangoPreset(preset: Exclude<Preset, "personalizado">, hoyISO: string) {
  const hoy = parseFecha(hoyISO);
  const [y, m] = hoyISO.split("-").map(Number);
  switch (preset) {
    case "mes":
      return { desde: new Date(Date.UTC(y, m - 1, 1)), hasta: hoy };
    case "anio":
      return { desde: new Date(Date.UTC(y, 0, 1)), hasta: hoy };
    case "3meses": {
      // Mismo día de hace 3 meses (Date.UTC ajusta los meses cortos), al día siguiente
      const haceTres = new Date(Date.UTC(y, m - 4, Number(hoyISO.slice(8, 10))));
      return { desde: sumarDias(haceTres, 1), hasta: hoy };
    }
  }
}

/** Lee los filtros desde los parámetros de la URL. Lo inválido vuelve al valor por defecto. */
export function parseFiltros(params: Params, hoyISO: string = hoyCRISO()): FiltrosReporte {
  const seccionParam = valor(params, "seccion");
  const seccion = SECCIONES.some((s) => s.value === seccionParam) ? (seccionParam as Seccion) : null;
  const pagina = Math.max(1, parseInt(valor(params, "pagina"), 10) || 1);

  const presetParam = valor(params, "periodo");
  if (presetParam === "personalizado") {
    const desdeISO = valor(params, "desde");
    const hastaISO = valor(params, "hasta");
    if (esFechaValida(desdeISO) && esFechaValida(hastaISO)) {
      const desde = parseFecha(desdeISO);
      const hasta = parseFecha(hastaISO);
      if (desde <= hasta && diferenciaDias(desde, hasta) < MAX_DIAS_REPORTE) {
        return { preset: "personalizado", desde, hasta, seccion, pagina };
      }
    }
  }

  const preset = PRESETS.some((p) => p.value === presetParam && p.value !== "personalizado")
    ? (presetParam as Exclude<Preset, "personalizado">)
    : PRESET_DEFECTO;
  return { preset, ...rangoPreset(preset as Exclude<Preset, "personalizado">, hoyISO), seccion, pagina };
}

/** Parámetros de URL que representan los filtros (sin la página). */
export function filtrosAParams(f: FiltrosReporte): URLSearchParams {
  const p = new URLSearchParams({ periodo: f.preset });
  if (f.preset === "personalizado") {
    p.set("desde", aISO(f.desde));
    p.set("hasta", aISO(f.hasta));
  }
  if (f.seccion) p.set("seccion", f.seccion);
  return p;
}

/** Desfase de Costa Rica respecto a UTC (no hay horario de verano). */
const OFFSET_CR_MS = 6 * 3_600_000;

/**
 * Rango de instantes [inicio, fin) que corresponde a los días de calendario del
 * período en hora de Costa Rica. Se usa para fechas que son instantes
 * (fechaSolicitud, fechaDevolucionReal...).
 */
export function rangoInstantes(f: Pick<FiltrosReporte, "desde" | "hasta">) {
  return {
    inicio: new Date(f.desde.getTime() + OFFSET_CR_MS),
    fin: new Date(sumarDias(f.hasta, 1).getTime() + OFFSET_CR_MS),
  };
}

/** Día de calendario en Costa Rica (medianoche UTC) de un instante. */
export function diaCR(instante: Date): Date {
  const local = new Date(instante.getTime() - OFFSET_CR_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}
