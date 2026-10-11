// Constantes de dominio compartidas entre servidor y cliente.

export const SECCIONES = [
  { value: "MANADA", label: "Manada" },
  { value: "TROPA", label: "Tropa" },
  { value: "WAK", label: "Wak" },
  { value: "COMUNIDAD", label: "Comunidad" },
] as const;

export type Seccion = (typeof SECCIONES)[number]["value"];

export const ESTADOS_SOLICITUD = [
  "PENDIENTE",
  "APROBADA",
  "ENTREGADA",
  "DEVUELTA",
  "RECHAZADA",
  "CANCELADA",
] as const;

export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];

export const ESTADO_SOLICITUD_CONFIG: Record<
  EstadoSolicitud,
  { label: string; badge: string; accent: string; color: string }
> = {
  PENDIENTE: { label: "Pendiente", badge: "bg-amber-100 text-amber-700", accent: "border-l-amber-400", color: "#f59e0b" },
  APROBADA: { label: "Aprobada", badge: "bg-green-100 text-green-700", accent: "border-l-green-500", color: "#22c55e" },
  ENTREGADA: { label: "Entregada", badge: "bg-sky-100 text-sky-700", accent: "border-l-sky-500", color: "#0ea5e9" },
  DEVUELTA: { label: "Devuelta", badge: "bg-slate-100 text-slate-600", accent: "border-l-slate-300", color: "#64748b" },
  RECHAZADA: { label: "Rechazada", badge: "bg-red-100 text-red-700", accent: "border-l-red-400", color: "#ef4444" },
  CANCELADA: { label: "Cancelada", badge: "bg-slate-100 text-slate-500", accent: "border-l-slate-200", color: "#cbd5e1" },
};

export const ESTADO_SOLICITUD_FILTROS = [
  { value: "", label: "Todos los estados" },
  ...ESTADOS_SOLICITUD.map((e) => ({ value: e, label: ESTADO_SOLICITUD_CONFIG[e].label })),
];

/** Filtros extra del panel de préstamos del admin (no son estados guardados). */
export const FILTROS_OPERATIVOS = [
  { value: "POR_ENTREGAR", label: "Por entregar (retiro ya llegó)" },
  { value: "VENCIDAS", label: "Devoluciones vencidas" },
] as const;

/** Préstamos que ocupan inventario. */
export const ESTADOS_ACTIVOS: EstadoSolicitud[] = ["APROBADA", "ENTREGADA"];

export const MOTIVOS_RECHAZO = [
  { value: "SIN_STOCK", label: "Sin stock para esas fechas" },
  { value: "CONFLICTO", label: "Conflicto con otra sección" },
  { value: "NO_APTO", label: "Material no apto para la sección" },
  { value: "MANTENIMIENTO", label: "Material en mantenimiento" },
  { value: "SOLICITUD_INCOMPLETA", label: "Solicitud incompleta o con fechas incorrectas" },
  { value: "DEVOLUCIONES_PENDIENTES", label: "Sección con devoluciones pendientes" },
  { value: "OTRO", label: "Otro" },
] as const;

export type MotivoRechazo = (typeof MOTIVOS_RECHAZO)[number]["value"];

export function etiquetaMotivoRechazo(motivo?: string | null): string {
  return MOTIVOS_RECHAZO.find((m) => m.value === motivo)?.label ?? "Sin motivo registrado";
}

/** Color fijo por sección (paleta categórica validada; sigue a la sección, nunca al orden). */
export const COLOR_SECCION: Record<Seccion, string> = {
  MANADA: "#2a78d6",
  TROPA: "#eb6834",
  WAK: "#1baf7a",
  COMUNIDAD: "#eda100",
};

export function etiquetaSeccion(seccion?: string | null): string {
  return SECCIONES.find((s) => s.value === seccion)?.label ?? "—";
}
