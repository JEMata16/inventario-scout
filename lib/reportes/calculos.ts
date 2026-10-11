// Cálculos puros de los reportes (sin base de datos), para poder probarlos.

import { aISO, diferenciaDias, sumarDias } from "../fechas";

// ── Períodos de la serie temporal ───────────────────────────────────────────

export type Granularidad = "dia" | "semana" | "mes";

/** Día si el período es de hasta 1 mes, semana hasta ~6 meses, mes si es más largo. */
export function granularidadPara(desde: Date, hasta: Date): Granularidad {
  const dias = diferenciaDias(desde, hasta) + 1;
  if (dias <= 31) return "dia";
  if (dias <= 186) return "semana";
  return "mes";
}

/** Inicio del grupo al que pertenece un día (lunes para semanas, día 1 para meses). */
export function inicioGrupo(dia: Date, g: Granularidad): Date {
  if (g === "dia") return dia;
  if (g === "mes") return new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), 1));
  const diaSemana = (dia.getUTCDay() + 6) % 7; // lunes = 0
  return sumarDias(dia, -diaSemana);
}

const fmtDia = new Intl.DateTimeFormat("es-CR", { timeZone: "UTC", day: "numeric", month: "short" });
const fmtMes = new Intl.DateTimeFormat("es-CR", { timeZone: "UTC", month: "short", year: "numeric" });

export function etiquetaGrupo(inicio: Date, g: Granularidad): string {
  if (g === "mes") return fmtMes.format(inicio);
  if (g === "semana") return `Sem. ${fmtDia.format(inicio)}`;
  return fmtDia.format(inicio);
}

/** Todos los grupos del período en orden, incluidos los vacíos. */
export function generarGrupos(desde: Date, hasta: Date, g: Granularidad): Array<{ clave: string; etiqueta: string }> {
  const grupos: Array<{ clave: string; etiqueta: string }> = [];
  let actual = inicioGrupo(desde, g);
  while (actual <= hasta) {
    grupos.push({ clave: aISO(actual), etiqueta: etiquetaGrupo(actual, g) });
    actual =
      g === "dia"
        ? sumarDias(actual, 1)
        : g === "semana"
          ? sumarDias(actual, 7)
          : new Date(Date.UTC(actual.getUTCFullYear(), actual.getUTCMonth() + 1, 1));
  }
  return grupos;
}

// ── Utilización ─────────────────────────────────────────────────────────────

export interface UsoMaterial {
  cantidad: number;
  /** Primer día de uso */
  inicio: Date;
  /** Último día de uso, inclusive */
  fin: Date;
}

/** Días (inclusive) en que [inicio, fin] se traslapa con [desde, hasta]. */
export function diasTraslapados(inicio: Date, fin: Date, desde: Date, hasta: Date): number {
  const a = inicio > desde ? inicio : desde;
  const b = fin < hasta ? fin : hasta;
  return b < a ? 0 : diferenciaDias(a, b) + 1;
}

/**
 * Porcentaje (0-100) de la capacidad del período que estuvo prestada:
 * unidades·día prestadas ÷ (unidades utilizables × días del período).
 * Devuelve null si el material no tiene unidades utilizables.
 */
export function porcentajeUtilizacion(usos: UsoMaterial[], unidades: number, desde: Date, hasta: Date): number | null {
  if (unidades <= 0) return null;
  const diasPeriodo = diferenciaDias(desde, hasta) + 1;
  const unidadesDia = usos.reduce((t, u) => t + u.cantidad * diasTraslapados(u.inicio, u.fin, desde, hasta), 0);
  return Math.min(100, Math.round((unidadesDia / (unidades * diasPeriodo)) * 100));
}

// ── Porcentajes ─────────────────────────────────────────────────────────────

/** Porcentaje entero, o null si no hay base. */
export function porcentaje(parte: number, total: number): number | null {
  return total > 0 ? Math.round((parte / total) * 100) : null;
}

// ── CSV ─────────────────────────────────────────────────────────────────────

/**
 * Genera un CSV para Excel en configuración regional de Costa Rica:
 * separador ";" (la coma es el separador decimal), BOM UTF-8 para que las
 * tildes se vean bien y saltos de línea CRLF.
 */
export function generarCSV(encabezados: string[], filas: Array<Array<string | number | null | undefined>>): string {
  const celda = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    // Evita que Excel interprete texto escrito por usuarios como fórmula (=, +, -, @)
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [encabezados, ...filas].map((fila) => fila.map(celda).join(";"));
  return "﻿" + lineas.join("\r\n") + "\r\n";
}
