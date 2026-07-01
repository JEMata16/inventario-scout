"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Alert } from "@/components/common";

// ── Types ────────────────────────────────────────────────────────────────────

interface MaterialOption {
  id: number;
  nombre: string;
  cantidad: number;
  categoria?: string | null;
}

interface MaterialRow {
  materialId: number | "";
  cantidad: number;
}

interface DetallePrestamo {
  id: number;
  materialId: number;
  cantidad: number;
  material: { nombre: string; imagen?: string | null; categoria?: string | null };
}

interface SolicitudPrestamo {
  id: number;
  estado: string;
  fechaSolicitud: string;
  fechaAprobacion?: string | null;
  fechaRechazo?: string | null;
  fechaDevolucionEsperada?: string | null;
  fechaDevolucionReal?: string | null;
  razonRechazo?: string | null;
  detalles: DetallePrestamo[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<string, { label: string; badge: string; accent: string }> = {
  PENDIENTE: { label: "Pendiente", badge: "bg-amber-100 text-amber-700", accent: "border-l-amber-400" },
  APROBADA: { label: "Aprobada", badge: "bg-green-100 text-green-700", accent: "border-l-green-500" },
  RECHAZADA: { label: "Rechazada", badge: "bg-red-100 text-red-700", accent: "border-l-red-400" },
  DEVUELTO: { label: "Devuelto", badge: "bg-slate-100 text-slate-600", accent: "border-l-slate-300" },
};

const ESTADO_FILTER_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "APROBADA", label: "Aprobada" },
  { value: "RECHAZADA", label: "Rechazada" },
  { value: "DEVUELTO", label: "Devuelto" },
];

function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CR", { year: "numeric", month: "short", day: "numeric" });
}

// ── Component ────────────────────────────────────────────────────────────────

export function MisPrestamos() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPrestamo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState("");
  const [pageError, setPageError] = useState("");

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rows, setRows] = useState<MaterialRow[]>([{ materialId: "", cantidad: 1 }]);
  const [materiales, setMateriales] = useState<MaterialOption[]>([]);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cancel state
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const fetchSolicitudes = useCallback(async () => {
    setIsLoading(true);
    setPageError("");
    const params = new URLSearchParams({ limit: "20", ...(filterEstado && { estado: filterEstado }) });
    try {
      const res = await fetch(`/api/prestamos?${params}`);
      const data = await res.json();
      if (res.ok) setSolicitudes(data.solicitudes);
      else setPageError(data.error ?? "Error al cargar solicitudes");
    } catch { setPageError("Error de conexión"); }
    finally { setIsLoading(false); }
  }, [filterEstado]);

  useEffect(() => { fetchSolicitudes(); }, [fetchSolicitudes]);

  // Fetch available materials for the form
  useEffect(() => {
    if (!isFormOpen) return;
    fetch("/api/materiales?estado=DISPONIBLE&limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.materiales) setMateriales(data.materiales);
      })
      .catch(() => {});
  }, [isFormOpen]);

  // ── Row helpers ──────────────────────────────────────────────────────────

  function addRow() { setRows((prev) => [...prev, { materialId: "", cantidad: 1 }]); }
  function removeRow(i: number) { setRows((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateRow(i: number, field: keyof MaterialRow, value: MaterialRow[typeof field]) {
    setRows((prev) => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  function getMaxCantidad(materialId: number | ""): number {
    if (!materialId) return 99;
    return materiales.find((m) => m.id === materialId)?.cantidad ?? 99;
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const filled = rows.filter((r) => r.materialId !== "");
    if (filled.length === 0) { setFormError("Debe seleccionar al menos un material"); return; }

    const hasDuplicates = new Set(filled.map((r) => r.materialId)).size < filled.length;
    if (hasDuplicates) { setFormError("No puede seleccionar el mismo material más de una vez"); return; }

    for (const r of filled) {
      if (r.cantidad < 1) { setFormError("Las cantidades deben ser mayores a 0"); return; }
      const max = getMaxCantidad(r.materialId);
      if (r.cantidad > max) { setFormError(`La cantidad solicitada supera el stock disponible`); return; }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/prestamos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materiales: filled.map((r) => ({ materialId: r.materialId, cantidad: r.cantidad })) }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Error al enviar solicitud"); return; }
      setIsFormOpen(false);
      setRows([{ materialId: "", cantidad: 1 }]);
      fetchSolicitudes();
    } catch { setFormError("Error de conexión. Inténtelo de nuevo."); }
    finally { setIsSubmitting(false); }
  }

  // ── Cancel ───────────────────────────────────────────────────────────────

  async function handleCancel() {
    if (!cancelingId) return;
    setIsCanceling(true);
    try {
      const res = await fetch(`/api/prestamos/${cancelingId}`, { method: "DELETE" });
      if (res.ok) {
        setCancelingId(null);
        fetchSolicitudes();
      }
    } catch { }
    finally { setIsCanceling(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors cursor-pointer"
        >
          {ESTADO_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="sm:ml-auto">
          <Button onClick={() => { setIsFormOpen(true); setFormError(""); setRows([{ materialId: "", cantidad: 1 }]); }} size="sm">
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
            {filterEstado ? "No hay solicitudes con ese estado" : "No tiene solicitudes de préstamo"}
          </p>
          <button
            onClick={() => { setIsFormOpen(true); setFormError(""); setRows([{ materialId: "", cantidad: 1 }]); }}
            className="mt-3 text-xs text-green-600 hover:text-green-700 underline cursor-pointer"
          >
            Crear primera solicitud
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {solicitudes.map((s) => {
            const cfg = ESTADO_CONFIG[s.estado] ?? ESTADO_CONFIG.PENDIENTE;
            return (
              <div key={s.id} className={`bg-white rounded-xl border border-slate-200 border-l-4 ${cfg.accent} shadow-sm p-5`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs text-slate-400 font-mono">Solicitud #{s.id}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Enviada el {formatDate(s.fechaSolicitud)}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Materials */}
                <div className="space-y-1.5 mb-3">
                  {s.detalles.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" aria-hidden="true" />
                      <span className="font-medium">{d.material.nombre}</span>
                      <span className="text-slate-400">×{d.cantidad}</span>
                    </div>
                  ))}
                </div>

                {/* Dates row */}
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 border-t border-slate-100 pt-3">
                  {s.fechaDevolucionEsperada && (
                    <span>Retorno esperado: <span className="font-medium text-slate-700">{formatDate(s.fechaDevolucionEsperada)}</span></span>
                  )}
                  {s.fechaDevolucionReal && (
                    <span>Devuelto el: <span className="font-medium text-slate-700">{formatDate(s.fechaDevolucionReal)}</span></span>
                  )}
                  {s.fechaRechazo && (
                    <span>Rechazado el: <span className="font-medium text-slate-700">{formatDate(s.fechaRechazo)}</span></span>
                  )}
                </div>

                {/* Rejection reason */}
                {s.razonRechazo && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-700 mb-0.5">Motivo de rechazo</p>
                    <p className="text-xs text-red-800">{s.razonRechazo}</p>
                  </div>
                )}

                {/* Actions */}
                {s.estado === "PENDIENTE" && (
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
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Nueva solicitud de préstamo</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" aria-label="Cerrar">
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
              </button>
            </div>

            <form id="solicitud-form" onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto space-y-4">
              {formError && <Alert type="error" onClose={() => setFormError("")}>{formError}</Alert>}

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Materiales solicitados</p>
                <div className="space-y-2">
                  {rows.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={row.materialId}
                        onChange={(e) => updateRow(i, "materialId", e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors cursor-pointer"
                        required
                      >
                        <option value="">Seleccionar material...</option>
                        {materiales.map((m) => (
                          <option key={m.id} value={m.id} disabled={rows.some((r, idx) => idx !== i && r.materialId === m.id)}>
                            {m.nombre} ({m.cantidad} disp.)
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={getMaxCantidad(row.materialId)}
                        value={row.cantidad}
                        onChange={(e) => updateRow(i, "cantidad", Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-20 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors text-center"
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
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addRow}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-green-600 hover:text-green-700 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" /></svg>
                  Agregar material
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Un administrador revisará su solicitud. Recibirá una respuesta con el estado de aprobación.
              </p>
            </form>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button form="solicitud-form" type="submit" size="sm" isLoading={isSubmitting}>
                Enviar solicitud
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
