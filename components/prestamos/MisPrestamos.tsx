"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Alert } from "@/components/common";
import { ESTADO_SOLICITUD_CONFIG, ESTADO_SOLICITUD_FILTROS, etiquetaMotivoRechazo, type EstadoSolicitud } from "@/lib/constantes";
import { esFechaValida, formatFecha, formatFechaHora, formatRango, hoyCRISO } from "@/lib/fechas";

// ── Types ────────────────────────────────────────────────────────────────────

interface Competidora {
  solicitudId: number;
  seccion: string;
  responsable: string;
  cantidad: number;
  fechaRetiro: string;
  fechaDevolucionEsperada: string;
  propia: boolean;
}

interface MaterialDisponibilidad {
  id: number;
  nombre: string;
  categoria?: string | null;
  disponible: number;
  disponibleConPendientes: number;
  pendientes: Competidora[];
}

interface MaterialRow {
  materialId: number | "";
  cantidad: number;
}

interface DetallePrestamo {
  id: number;
  materialId: number;
  cantidad: number;
  cantidadDanada: number;
  cantidadFaltante: number;
  observaciones?: string | null;
  material: { nombre: string; categoria?: string | null };
}

interface SolicitudPrestamo {
  id: number;
  estado: EstadoSolicitud;
  responsable: string;
  actividad?: string | null;
  fechaSolicitud: string;
  fechaRetiro: string;
  fechaDevolucionEsperada: string;
  fechaAprobacion?: string | null;
  fechaRechazo?: string | null;
  fechaEntrega?: string | null;
  fechaDevolucionReal?: string | null;
  fechaCancelacion?: string | null;
  motivoRechazo?: string | null;
  razonRechazo?: string | null;
  observacionesDevolucion?: string | null;
  detalles: DetallePrestamo[];
}

const FILA_VACIA: MaterialRow = { materialId: "", cantidad: 1 };

const inputClass =
  "w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors";

// ── Component ────────────────────────────────────────────────────────────────

export function MisPrestamos() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPrestamo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState("");
  const [pageError, setPageError] = useState("");

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [responsable, setResponsable] = useState("");
  const [actividad, setActividad] = useState("");
  const [fechaRetiro, setFechaRetiro] = useState("");
  const [fechaDevolucion, setFechaDevolucion] = useState("");
  const [rows, setRows] = useState<MaterialRow[]>([FILA_VACIA]);
  // Resultado de disponibilidad etiquetado con el rango consultado
  const [disp, setDisp] = useState<{ rango: string; materiales: MaterialDisponibilidad[]; error: string }>({
    rango: "",
    materiales: [],
    error: "",
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cancel state
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const fetchSolicitudes = useCallback(async () => {
    setIsLoading(true);
    setPageError("");
    const params = new URLSearchParams({ limit: "50", ...(filterEstado && { estado: filterEstado }) });
    try {
      const res = await fetch(`/api/prestamos?${params}`);
      const data = await res.json();
      if (res.ok) setSolicitudes(data.solicitudes);
      else setPageError(data.error ?? "Error al cargar solicitudes");
    } catch { setPageError("Error de conexión"); }
    finally { setIsLoading(false); }
  }, [filterEstado]);

  useEffect(() => { fetchSolicitudes(); }, [fetchSolicitudes]);

  // Disponibilidad para las fechas elegidas
  const fechasCompletas =
    esFechaValida(fechaRetiro) && esFechaValida(fechaDevolucion) && fechaDevolucion >= fechaRetiro;
  const rango = fechasCompletas ? `${fechaRetiro}|${fechaDevolucion}` : "";
  const dispVigente = rango !== "" && disp.rango === rango;
  const materiales = dispVigente ? disp.materiales : [];
  const dispError = dispVigente ? disp.error : "";
  const isLoadingDisp = rango !== "" && !dispVigente;

  useEffect(() => {
    if (!isFormOpen || !rango) return;
    const [desde, hasta] = rango.split("|");
    let cancelado = false;
    fetch(`/api/prestamos/disponibilidad?desde=${desde}&hasta=${hasta}`)
      .then(async (r) => {
        const data = await r.json();
        if (cancelado) return;
        setDisp(
          r.ok
            ? { rango, materiales: data.materiales, error: "" }
            : { rango, materiales: [], error: data.error ?? "No se pudo consultar la disponibilidad" }
        );
      })
      .catch(() => { if (!cancelado) setDisp({ rango, materiales: [], error: "Error de conexión" }); });
    return () => { cancelado = true; };
  }, [isFormOpen, rango]);

  // ── Form helpers ─────────────────────────────────────────────────────────

  function openForm() {
    setIsFormOpen(true);
    setFormError("");
    setResponsable("");
    setActividad("");
    setFechaRetiro("");
    setFechaDevolucion("");
    setRows([FILA_VACIA]);
    setDisp({ rango: "", materiales: [], error: "" });
  }

  function addRow() { setRows((prev) => [...prev, FILA_VACIA]); }
  function removeRow(i: number) { setRows((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateRow(i: number, field: keyof MaterialRow, value: MaterialRow[typeof field]) {
    setRows((prev) => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  function materialDe(row: MaterialRow) {
    return row.materialId === "" ? undefined : materiales.find((m) => m.id === row.materialId);
  }

  /** Solicitudes pendientes de otras secciones con las que esta fila compite. */
  function conflictoDe(row: MaterialRow): Competidora[] {
    const m = materialDe(row);
    if (!m || row.cantidad > m.disponible || row.cantidad <= m.disponibleConPendientes) return [];
    return m.pendientes.filter((p) => !p.propia);
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (responsable.trim().length < 3) { setFormError("Indique el nombre del dirigente responsable"); return; }
    if (!fechasCompletas) { setFormError("Indique fechas de retiro y devolución válidas"); return; }

    const filled = rows.filter((r) => r.materialId !== "");
    if (filled.length === 0) { setFormError("Debe seleccionar al menos un material"); return; }

    const hasDuplicates = new Set(filled.map((r) => r.materialId)).size < filled.length;
    if (hasDuplicates) { setFormError("No puede seleccionar el mismo material más de una vez"); return; }

    for (const r of filled) {
      const m = materialDe(r);
      if (r.cantidad < 1) { setFormError("Las cantidades deben ser mayores a 0"); return; }
      if (m && r.cantidad > m.disponible) {
        setFormError(`Solo hay ${m.disponible} unidad(es) de "${m.nombre}" disponibles para esas fechas`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/prestamos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responsable: responsable.trim(),
          actividad: actividad.trim() || undefined,
          fechaRetiro,
          fechaDevolucionEsperada: fechaDevolucion,
          materiales: filled.map((r) => ({ materialId: r.materialId, cantidad: r.cantidad })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Error al enviar solicitud"); return; }
      setIsFormOpen(false);
      fetchSolicitudes();
    } catch { setFormError("Error de conexión. Inténtelo de nuevo."); }
    finally { setIsSubmitting(false); }
  }

  // ── Cancel ───────────────────────────────────────────────────────────────

  async function handleCancel() {
    if (!cancelingId) return;
    setIsCanceling(true);
    try {
      const res = await fetch(`/api/prestamos/${cancelingId}/cancelar`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) setPageError(data.error ?? "No se pudo cancelar la solicitud");
      setCancelingId(null);
      fetchSolicitudes();
    } catch { setPageError("Error de conexión"); }
    finally { setIsCanceling(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const hoy = hoyCRISO();
  const hayConflictos = rows.some((r) => conflictoDe(r).length > 0);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors cursor-pointer"
        >
          {ESTADO_SOLICITUD_FILTROS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="sm:ml-auto">
          <Button onClick={openForm} size="sm">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
            </svg>
            Nueva solicitud
          </Button>
        </div>
      </div>

      {pageError && <Alert type="error" onClose={() => setPageError("")}>{pageError}</Alert>}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 bg-slate-100 rounded w-24" />
                <div className="h-5 bg-slate-100 rounded-full w-20" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <svg className="w-12 h-12 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
          </svg>
          <p className="text-sm font-medium">
            {filterEstado ? "No hay solicitudes con ese estado" : "La sección no tiene solicitudes de préstamo"}
          </p>
          <button onClick={openForm} className="mt-3 text-xs text-green-600 hover:text-green-700 underline cursor-pointer">
            Crear primera solicitud
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {solicitudes.map((s) => {
            const cfg = ESTADO_SOLICITUD_CONFIG[s.estado] ?? ESTADO_SOLICITUD_CONFIG.PENDIENTE;
            const vencida = s.estado === "ENTREGADA" && s.fechaDevolucionEsperada.slice(0, 10) < hoy;
            const cancelable = s.estado === "PENDIENTE" || s.estado === "APROBADA";
            return (
              <div key={s.id} className={`bg-white rounded-xl border border-slate-200 border-l-4 ${cfg.accent} shadow-sm p-5`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs text-slate-400 font-mono">Solicitud #{s.id}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">
                      {formatRango(s.fechaRetiro, s.fechaDevolucionEsperada)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {s.actividad ? <>{s.actividad} · </> : null}Responsable: {s.responsable}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    {vencida && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Devolución vencida
                      </span>
                    )}
                  </div>
                </div>

                {/* Materials */}
                <div className="space-y-1.5 mb-3">
                  {s.detalles.map((d) => (
                    <div key={d.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" aria-hidden="true" />
                      <span className="font-medium">{d.material.nombre}</span>
                      <span className="text-slate-400">×{d.cantidad}</span>
                      {s.estado === "DEVUELTA" && d.cantidadDanada > 0 && (
                        <span className="text-xs text-amber-700 bg-amber-50 px-1.5 rounded">{d.cantidadDanada} dañada(s)</span>
                      )}
                      {s.estado === "DEVUELTA" && d.cantidadFaltante > 0 && (
                        <span className="text-xs text-red-700 bg-red-50 px-1.5 rounded">{d.cantidadFaltante} faltante(s)</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Dates row */}
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 border-t border-slate-100 pt-3">
                  <span>Enviada: <span className="font-medium text-slate-700">{formatFechaHora(s.fechaSolicitud)}</span></span>
                  {s.fechaAprobacion && <span>Aprobada: <span className="font-medium text-slate-700">{formatFechaHora(s.fechaAprobacion)}</span></span>}
                  {s.fechaEntrega && <span>Retirada: <span className="font-medium text-slate-700">{formatFechaHora(s.fechaEntrega)}</span></span>}
                  {s.fechaDevolucionReal && <span>Devuelta: <span className="font-medium text-slate-700">{formatFechaHora(s.fechaDevolucionReal)}</span></span>}
                  {s.fechaRechazo && <span>Rechazada: <span className="font-medium text-slate-700">{formatFechaHora(s.fechaRechazo)}</span></span>}
                  {s.fechaCancelacion && <span>Cancelada: <span className="font-medium text-slate-700">{formatFechaHora(s.fechaCancelacion)}</span></span>}
                </div>

                {s.estado === "RECHAZADA" && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-700 mb-0.5">Motivo de rechazo: {etiquetaMotivoRechazo(s.motivoRechazo)}</p>
                    {s.razonRechazo && <p className="text-xs text-red-800">{s.razonRechazo}</p>}
                  </div>
                )}

                {s.observacionesDevolucion && (
                  <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-600 mb-0.5">Observaciones de la devolución</p>
                    <p className="text-xs text-slate-700">{s.observacionesDevolucion}</p>
                  </div>
                )}

                {/* Actions */}
                {cancelable && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                    {cancelingId === s.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">¿Cancelar esta solicitud?</span>
                        <Button variant="danger" size="sm" onClick={handleCancel} isLoading={isCanceling}>Sí, cancelar</Button>
                        <Button variant="outline" size="sm" onClick={() => setCancelingId(null)} disabled={isCanceling}>No</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setCancelingId(s.id)}>
                        Cancelar solicitud
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Form Modal ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Nueva solicitud de préstamo</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" aria-label="Cerrar">
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
              </button>
            </div>

            <form id="solicitud-form" onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto space-y-5">
              {formError && <Alert type="error" onClose={() => setFormError("")}>{formError}</Alert>}

              {/* Datos generales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="responsable" className="text-sm font-medium text-slate-700">Dirigente responsable *</label>
                  <input id="responsable" value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Ej. María Fernández" className={inputClass} maxLength={100} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="actividad" className="text-sm font-medium text-slate-700">Actividad</label>
                  <input id="actividad" value={actividad} onChange={(e) => setActividad(e.target.value)} placeholder="Ej. Campamento de patrulla" className={inputClass} maxLength={200} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fecha-retiro" className="text-sm font-medium text-slate-700">Fecha de retiro *</label>
                  <input
                    id="fecha-retiro"
                    type="date"
                    min={hoy}
                    value={fechaRetiro}
                    onChange={(e) => {
                      setFechaRetiro(e.target.value);
                      if (fechaDevolucion && e.target.value > fechaDevolucion) setFechaDevolucion(e.target.value);
                    }}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fecha-devolucion" className="text-sm font-medium text-slate-700">Fecha de devolución *</label>
                  <input
                    id="fecha-devolucion"
                    type="date"
                    min={fechaRetiro || hoy}
                    value={fechaDevolucion}
                    onChange={(e) => setFechaDevolucion(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Materiales */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Materiales solicitados</p>

                {!fechasCompletas ? (
                  <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    Seleccione las fechas para ver qué materiales están disponibles.
                  </p>
                ) : isLoadingDisp ? (
                  <p className="text-sm text-slate-500">Consultando disponibilidad...</p>
                ) : dispError ? (
                  <Alert type="error">{dispError}</Alert>
                ) : (
                  <>
                    <div className="space-y-3">
                      {rows.map((row, i) => {
                        const m = materialDe(row);
                        const excede = !!m && row.cantidad > m.disponible;
                        const competidoras = conflictoDe(row);
                        return (
                          <div key={i}>
                            <div className="flex items-center gap-2">
                              <select
                                value={row.materialId}
                                onChange={(e) => updateRow(i, "materialId", e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                                className={`flex-1 ${inputClass} cursor-pointer`}
                                required
                              >
                                <option value="">Seleccionar material...</option>
                                {materiales.map((opt) => (
                                  <option
                                    key={opt.id}
                                    value={opt.id}
                                    disabled={opt.disponible === 0 || rows.some((r, idx) => idx !== i && r.materialId === opt.id)}
                                  >
                                    {opt.nombre} ({opt.disponible === 0 ? "sin unidades en esas fechas" : `${opt.disponible} disp.`})
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min={1}
                                max={m?.disponible ?? undefined}
                                value={row.cantidad}
                                onChange={(e) => updateRow(i, "cantidad", Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className={`w-20 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-center ${excede ? "border-red-400" : "border-slate-300 hover:border-slate-400"}`}
                                aria-label="Cantidad"
                              />
                              {rows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeRow(i)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer flex-shrink-0"
                                  aria-label="Eliminar fila"
                                >
                                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                                </button>
                              )}
                            </div>
                            {excede && (
                              <p className="mt-1 text-xs text-red-600">
                                Solo hay {m!.disponible} unidad(es) disponibles para esas fechas.
                              </p>
                            )}
                            {competidoras.length > 0 && (
                              <div className="mt-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                <p className="font-medium">Otras secciones también pidieron este material para fechas que se traslapan:</p>
                                <ul className="mt-0.5 list-disc list-inside">
                                  {competidoras.map((c) => (
                                    <li key={c.solicitudId}>
                                      {c.seccion}: {c.cantidad} unidad(es), {formatRango(c.fechaRetiro, c.fechaDevolucionEsperada)}
                                    </li>
                                  ))}
                                </ul>
                                <p className="mt-0.5">No alcanza para todas. Puede enviar la solicitud y el administrador decidirá, o ajustar fechas o cantidades.</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={addRow}
                      className="mt-3 flex items-center gap-1.5 text-xs font-medium text-green-600 hover:text-green-700 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" /></svg>
                      Agregar material
                    </button>
                  </>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Un administrador revisará la solicitud. El material queda apartado para la sección cuando la solicitud se aprueba.
                {fechasCompletas && <> Uso del {formatFecha(fechaRetiro)} al {formatFecha(fechaDevolucion)}.</>}
              </p>
            </form>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button form="solicitud-form" type="submit" size="sm" isLoading={isSubmitting} disabled={!fechasCompletas || isLoadingDisp}>
                {hayConflictos ? "Enviar de todas formas" : "Enviar solicitud"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
