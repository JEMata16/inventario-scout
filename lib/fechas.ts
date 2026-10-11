// Utilidades de fechas de calendario.
//
// Las fechas de retiro y devolución de un préstamo son días de calendario,
// no instantes. Se guardan como medianoche UTC ("2026-10-14" -> 2026-10-14T00:00Z)
// y se formatean siempre en UTC para que el día no se corra por la zona horaria.
// "Hoy" se calcula en la zona horaria de Costa Rica.

export const ZONA_HORARIA_CR = "America/Costa_Rica";
const DIA_MS = 86_400_000;
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Convierte "YYYY-MM-DD" a Date a medianoche UTC. */
export function parseFecha(fecha: string): Date {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function esFechaValida(fecha: string): boolean {
  if (!FECHA_REGEX.test(fecha)) return false;
  return aISO(parseFecha(fecha)) === fecha;
}

/** Date (o string ISO) -> "YYYY-MM-DD" según UTC. */
export function aISO(fecha: Date | string): string {
  return new Date(fecha).toISOString().slice(0, 10);
}

/** Fecha de hoy en Costa Rica como "YYYY-MM-DD". */
export function hoyCRISO(): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA_CR }).format(new Date());
}

/** Fecha de hoy en Costa Rica a medianoche UTC. */
export function hoyCR(): Date {
  return parseFecha(hoyCRISO());
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * DIA_MS);
}

export function diferenciaDias(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / DIA_MS);
}

/** Formatea una fecha de calendario (retiro / devolución esperada). */
export function formatFecha(fecha?: Date | string | null): string {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-CR", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Formatea un instante (fecha de solicitud, aprobación, entrega...) en hora de Costa Rica. */
export function formatFechaHora(fecha?: Date | string | null): string {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-CR", {
    timeZone: ZONA_HORARIA_CR,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRango(desde: Date | string, hasta: Date | string): string {
  return `${formatFecha(desde)} – ${formatFecha(hasta)}`;
}
