"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Alert, Modal } from "@/components/common";
import {
  ESTADO_SOLICITUD_CONFIG,
  ESTADO_SOLICITUD_FILTROS,
  FILTROS_OPERATIVOS,
  MOTIVOS_RECHAZO,
  etiquetaMotivoRechazo,
  SECCIONES,
  type EstadoSolicitud,
} from "@/lib/constantes";
import { aISO, formatFechaHora, formatRango, hoyCRISO } from "@/lib/fechas";

// ── Types ────────────────────────────────────────────────────────────────────

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
  usuarioId: number;
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
  usuario: { nombre: string; seccion?: string | null; email: string };
  detalles: DetallePrestamo[];
  conflicto: "SIN_STOCK" | "COMPITE" | null;
}

interface AnalisisMaterial {
  detalleId: number;
  materialId: number;
  solicitado: number;
  disponible: number;
  cantidadTotal: number;
  cantidadMantenimiento: number;
  reservado: number;
  estadoMaterial: string;
  suficiente: boolean;
  pendientes: Array<{
    solicitudId: number;
    seccion: string;
    responsable: string;
    cantidad: number;
    fechaRetiro: string;
    fechaDevolucionEsperada: string;
  }>;
}

interface RevisionDetalle {
  cantidadDanada: number;
  cantidadFaltante: number;
  observaciones: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const selectClass =
  "px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors cursor-pointer";
const inputClass =
  "w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors";

const CloseIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
);

function esVencida(s: SolicitudPrestamo, hoy: string) {
  return s.estado === "ENTREGADA" && aISO(s.fechaDevolucionEsperada) < hoy;
}

// ── Component ────────────────────────────────────────────────────────────────

interface PrestamosManagerProps {
  /** Filtro inicial desde la URL (?estado=...), p. ej. desde la franja operativa de Análisis */
  estadoInicial?: string;
  seccionInicial?: string;
}

export function PrestamosManager({ estadoInicial = "", seccionInicial = "" }: PrestamosManagerProps) {
  const [solicitudes, setSolicitudes] = useState<SolicitudPrestamo[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState(estadoInicial);
  const [filterSeccion, setFilterSeccion] = useState(seccionInicial);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");

  // Modal state
  const [viewing, setViewing] = useState<SolicitudPrestamo | null>(null);
  const [aprobando, setAprobando] = useState<SolicitudPrestamo | null>(null);
  const [rechazando, setRechazando] = useState<SolicitudPrestamo | null>(null);
  const [entregando, setEntregando] = useState<SolicitudPrestamo | null>(null);
  const [devolviendo, setDevolviendo] = useState<SolicitudPrestamo | null>(null);
  const [cancelando, setCancelando] = useState<SolicitudPrestamo | null>(null);

  // Action form state
  const [analisis, setAnalisis] = useState<AnalisisMaterial[] | null>(null);
  const [isLoadingAnalisis, setIsLoadingAnalisis] = useState(false);
  const [fechaDevolucion, setFechaDevolucion] = useState("");
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [razonRechazo, setRazonRechazo] = useState("");
  const [revision, setRevision] = useState<Record<number, RevisionDetalle>>({});
  const [observacionesDevolucion, setObservacionesDevolucion] = useState("");
  const [actionError, setActionError] = useState("");
  const [isActing, setIsActing] = useState(false);

  const fetchSolicitudes = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: "10",
      ...(search && { search }),
      ...(filterEstado && { estado: filterEstado }),
      ...(filterSeccion && { seccion: filterSeccion }),
    });
    try {
      const res = await fetch(`/api/prestamos?${params}`);
      const data = await res.json();
      if (res.ok) {
        setSolicitudes(data.solicitudes);
        setPagination(data.pagination);
      } else {
        setError(data.error ?? "Error al cargar solicitudes");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, filterEstado, filterSeccion]);

  useEffect(() => { fetchSolicitudes(); }, [fetchSolicitudes]);

  useEffect(() => {
    const t = setTimeout(() => setCurrentPage(1), 300);
    return () => clearTimeout(t);
  }, [search, filterEstado, filterSeccion]);

  // ── Actions ──────────────────────────────────────────────────────────────

  async function runAction(url: string, body: unknown, onDone: () => void) {
    setIsActing(true);
    setActionError("");
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error ?? "No se pudo completar la acción"); return; }
      onDone();
      fetchSolicitudes();
    } catch { setActionError("Error de conexión"); }
    finally { setIsActing(false); }
  }

  async function openAprobar(s: SolicitudPrestamo) {
    setAprobando(s);
    setFechaDevolucion(aISO(s.fechaDevolucionEsperada));
    setActionError("");
    setAnalisis(null);
    setIsLoadingAnalisis(true);
    try {
      const res = await fetch(`/api/prestamos/${s.id}`);
      const data = await res.json();
      if (res.ok) setAnalisis(data.analisis ?? []);
      else setActionError(data.error ?? "No se pudo analizar la disponibilidad");
    } catch { setActionError("Error de conexión"); }
    finally { setIsLoadingAnalisis(false); }
  }

  function handleAprobar() {
    if (!aprobando) return;
    const original = aISO(aprobando.fechaDevolucionEsperada);
    runAction(
      `/api/prestamos/${aprobando.id}/aprobar`,
      fechaDevolucion && fechaDevolucion !== original ? { fechaDevolucionEsperada: fechaDevolucion } : {},
      () => setAprobando(null)
    );
  }

  function handleRechazar() {
    if (!rechazando) return;
    if (!motivoRechazo) { setActionError("Seleccione un motivo de rechazo"); return; }
    if (motivoRechazo === "OTRO" && razonRechazo.trim().length < 5) {
      setActionError("Describa el motivo (al menos 5 caracteres)");
      return;
    }
    runAction(
      `/api/prestamos/${rechazando.id}/rechazar`,
      { motivo: motivoRechazo, razon: razonRechazo.trim() || undefined },
      () => setRechazando(null)
    );
  }

  function handleEntregar() {
    if (!entregando) return;
    runAction(`/api/prestamos/${entregando.id}/entregar`, {}, () => setEntregando(null));
  }

  function handleCancelar() {
    if (!cancelando) return;
    runAction(`/api/prestamos/${cancelando.id}/cancelar`, {}, () => setCancelando(null));
  }

  function openDevolver(s: SolicitudPrestamo) {
    setDevolviendo(s);
    setActionError("");
    setObservacionesDevolucion("");
    setRevision(Object.fromEntries(s.detalles.map((d) => [d.id, { cantidadDanada: 0, cantidadFaltante: 0, observaciones: "" }])));
  }

  function updateRevision(detalleId: number, field: keyof RevisionDetalle, value: number | string) {
    setRevision((prev) => ({ ...prev, [detalleId]: { ...prev[detalleId], [field]: value } }));
  }

  function handleDevolver() {
    if (!devolviendo) return;
    for (const d of devolviendo.detalles) {
      const r = revision[d.id];
      if (r && r.cantidadDanada + r.cantidadFaltante > d.cantidad) {
        setActionError(`"${d.material.nombre}": dañadas + faltantes no puede superar ${d.cantidad}`);
        return;
      }
    }
    runAction(
      `/api/prestamos/${devolviendo.id}/devolver`,
      {
        observaciones: observacionesDevolucion.trim() || undefined,
        detalles: devolviendo.detalles.map((d) => ({
          detalleId: d.id,
          cantidadDanada: revision[d.id]?.cantidadDanada ?? 0,
          cantidadFaltante: revision[d.id]?.cantidadFaltante ?? 0,
          observaciones: revision[d.id]?.observaciones.trim() || undefined,
        })),
      },
      () => setDevolviendo(null)
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const hoy = hoyCRISO();
  const aprobacionBloqueada = !analisis || analisis.some((a) => !a.suficiente);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9z" clipRule="evenodd" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por responsable, actividad o material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors placeholder:text-slate-400"
          />
        </div>
        <select value={filterSeccion} onChange={(e) => { setFilterSeccion(e.target.value); setCurrentPage(1); }} className={selectClass}>
          <option value="">Todas las secciones</option>
          {SECCIONES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterEstado} onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }} className={selectClass}>
          {ESTADO_SOLICITUD_FILTROS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          {FILTROS_OPERATIVOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {error && <Alert type="error" onClose={() => setError("")}>{error}</Alert>}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-12">#</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Sección</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Materiales</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Fechas de uso</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : solicitudes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <p className="text-sm font-medium">
                        {search || filterEstado || filterSeccion ? "Sin resultados para la búsqueda" : "No hay solicitudes de préstamo"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                solicitudes.map((s) => {
                  const badge = ESTADO_SOLICITUD_CONFIG[s.estado] ?? ESTADO_SOLICITUD_CONFIG.PENDIENTE;
                  const vencida = esVencida(s, hoy);
                  const puedeEntregar = aISO(s.fechaRetiro) <= hoy;
                  return (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-400 text-xs font-mono">#{s.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{s.usuario.nombre}</p>
                        <p className="text-xs text-slate-400">{s.responsable}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-600 text-xs">
                        <span className="font-medium">{s.detalles.length} ítem{s.detalles.length !== 1 ? "s" : ""}</span>
                        <p className="text-slate-400 line-clamp-1">
                          {s.detalles.map((d) => `${d.material.nombre} ×${d.cantidad}`).join(", ")}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-slate-600 text-xs whitespace-nowrap">
                        {formatRango(s.fechaRetiro, s.fechaDevolucionEsperada)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.badge}`}>
                            {badge.label}
                          </span>
                          {s.conflicto === "SIN_STOCK" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700" title="Ya no hay stock suficiente para esas fechas">
                              Sin stock
                            </span>
                          )}
                          {s.conflicto === "COMPITE" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800" title="Otra sección pidió el mismo material para fechas que se traslapan">
                              Conflicto
                            </span>
                          )}
                          {vencida && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Vencida
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setViewing(s)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Ver detalle"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
                              <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41z" clipRule="evenodd" />
                            </svg>
                          </button>
                          {s.estado === "PENDIENTE" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => openAprobar(s)}>Revisar</Button>
                              <button
                                onClick={() => { setRechazando(s); setMotivoRechazo(""); setRazonRechazo(""); setActionError(""); }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                title="Rechazar"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                              </button>
                            </>
                          )}
                          {s.estado === "APROBADA" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setEntregando(s); setActionError(""); }}
                                disabled={!puedeEntregar}
                              >
                                <span title={puedeEntregar ? undefined : "Disponible a partir de la fecha de retiro"}>Entregar</span>
                              </Button>
                              <button
                                onClick={() => { setCancelando(s); setActionError(""); }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                title="Cancelar préstamo"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                              </button>
                            </>
                          )}
                          {s.estado === "ENTREGADA" && (
                            <Button size="sm" variant="outline" onClick={() => openDevolver(s)}>Recibir</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Mostrando {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer" aria-label="Página anterior">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" /></svg>
              </button>
              <span className="px-2 text-xs text-slate-600">{currentPage} / {pagination.totalPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={currentPage === pagination.totalPages} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer" aria-label="Página siguiente">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {!isLoading && (
        <p className="text-xs text-slate-400 mt-3">
          {pagination.total} {pagination.total === 1 ? "solicitud" : "solicitudes"}
        </p>
      )}

      {/* ── Detail Modal ── */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setViewing(null)} aria-hidden="true" />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Detalle de solicitud #{viewing.id}</h2>
              <button onClick={() => setViewing(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" aria-label="Cerrar"><CloseIcon /></button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Sección</p>
                  <p className="text-sm font-medium text-slate-900">{viewing.usuario.nombre}</p>
                  <p className="text-xs text-slate-500">Responsable: {viewing.responsable}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Estado</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ESTADO_SOLICITUD_CONFIG[viewing.estado]?.badge}`}>
                    {ESTADO_SOLICITUD_CONFIG[viewing.estado]?.label}
                  </span>
                </div>
              </div>
              {viewing.actividad && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Actividad</p>
                  <p className="text-sm text-slate-700">{viewing.actividad}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2"><span className="text-slate-400">Fechas de uso</span><p className="font-medium text-slate-700">{formatRango(viewing.fechaRetiro, viewing.fechaDevolucionEsperada)}</p></div>
                <div><span className="text-slate-400">Solicitada</span><p className="font-medium text-slate-700">{formatFechaHora(viewing.fechaSolicitud)}</p></div>
                {viewing.fechaAprobacion && <div><span className="text-slate-400">Aprobada</span><p className="font-medium text-slate-700">{formatFechaHora(viewing.fechaAprobacion)}</p></div>}
                {viewing.fechaEntrega && <div><span className="text-slate-400">Entregada</span><p className="font-medium text-slate-700">{formatFechaHora(viewing.fechaEntrega)}</p></div>}
                {viewing.fechaDevolucionReal && <div><span className="text-slate-400">Devuelta</span><p className="font-medium text-slate-700">{formatFechaHora(viewing.fechaDevolucionReal)}</p></div>}
                {viewing.fechaRechazo && <div><span className="text-slate-400">Rechazada</span><p className="font-medium text-slate-700">{formatFechaHora(viewing.fechaRechazo)}</p></div>}
                {viewing.fechaCancelacion && <div><span className="text-slate-400">Cancelada</span><p className="font-medium text-slate-700">{formatFechaHora(viewing.fechaCancelacion)}</p></div>}
              </div>
              {viewing.estado === "RECHAZADA" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">{etiquetaMotivoRechazo(viewing.motivoRechazo)}</p>
                  {viewing.razonRechazo && <p className="text-sm text-red-800">{viewing.razonRechazo}</p>}
                </div>
              )}
              {viewing.observacionesDevolucion && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Observaciones de la devolución</p>
                  <p className="text-sm text-slate-700">{viewing.observacionesDevolucion}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Materiales</p>
                <div className="space-y-2">
                  {viewing.detalles.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{d.material.nombre}</p>
                        {d.material.categoria && <p className="text-xs text-slate-400">{d.material.categoria}</p>}
                        {viewing.estado === "DEVUELTA" && (d.cantidadDanada > 0 || d.cantidadFaltante > 0) && (
                          <p className="text-xs text-amber-700 mt-0.5">
                            {d.cantidadDanada > 0 && `${d.cantidadDanada} dañada(s) `}
                            {d.cantidadFaltante > 0 && `${d.cantidadFaltante} faltante(s)`}
                            {d.observaciones && ` · ${d.observaciones}`}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-slate-700 flex-shrink-0">×{d.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setViewing(null)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Aprobar Modal (con análisis de disponibilidad) ── */}
      {aprobando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setAprobando(null)} aria-hidden="true" />
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Revisar solicitud #{aprobando.id}</h2>
              <button onClick={() => setAprobando(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Cerrar"><CloseIcon /></button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-900">{aprobando.usuario.nombre}</span> ({aprobando.responsable})
                {aprobando.actividad && <> · {aprobando.actividad}</>}
                <br />
                Uso: <span className="font-medium text-slate-900">{formatRango(aprobando.fechaRetiro, aprobando.fechaDevolucionEsperada)}</span>
              </p>
              {actionError && <Alert type="error" onClose={() => setActionError("")}>{actionError}</Alert>}

              {isLoadingAnalisis ? (
                <p className="text-sm text-slate-500">Analizando disponibilidad...</p>
              ) : analisis && (
                <div className="space-y-2">
                  {analisis.map((a) => {
                    const detalle = aprobando.detalles.find((d) => d.id === a.detalleId);
                    return (
                      <div key={a.detalleId} className={`p-3 rounded-lg border ${a.suficiente ? "border-slate-200 bg-slate-50" : "border-red-200 bg-red-50"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900">{detalle?.material.nombre}</p>
                          <p className={`text-xs font-semibold ${a.suficiente ? "text-green-700" : "text-red-700"}`}>
                            Pide {a.solicitado} · Disponibles {a.disponible}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Total {a.cantidadTotal} · En mantenimiento {a.cantidadMantenimiento} · Reservadas en esas fechas {a.reservado}
                          {a.estadoMaterial !== "DISPONIBLE" && " · El material no está habilitado para préstamo"}
                        </p>
                        {a.pendientes.length > 0 && (
                          <div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                            <p className="font-medium">También lo piden (pendientes, fechas traslapadas):</p>
                            <ul className="list-disc list-inside">
                              {a.pendientes.map((p) => (
                                <li key={p.solicitudId}>
                                  #{p.solicitudId} {p.seccion}: {p.cantidad} unidad(es), {formatRango(p.fechaRetiro, p.fechaDevolucionEsperada)}
                                </li>
                              ))}
                            </ul>
                            {a.solicitado + a.pendientes.reduce((t, p) => t + p.cantidad, 0) > a.disponible && (
                              <p className="mt-0.5">No alcanza para todas: aprobar esta puede dejar sin stock a las otras.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="fecha-devolucion" className="text-sm font-medium text-slate-700">Fecha de devolución</label>
                <input
                  id="fecha-devolucion"
                  type="date"
                  min={aISO(aprobando.fechaRetiro)}
                  value={fechaDevolucion}
                  onChange={(e) => setFechaDevolucion(e.target.value)}
                  className={inputClass}
                />
                <p className="text-xs text-slate-400">Puede ajustarla antes de aprobar. Se vuelve a validar la disponibilidad.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setAprobando(null)} disabled={isActing}>Cerrar</Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => { const s = aprobando; setAprobando(null); setRechazando(s); setMotivoRechazo(""); setRazonRechazo(""); setActionError(""); }}
                disabled={isActing}
              >
                Rechazar
              </Button>
              <Button size="sm" onClick={handleAprobar} isLoading={isActing} disabled={aprobacionBloqueada}>Aprobar</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rechazar Modal ── */}
      {rechazando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setRechazando(null)} aria-hidden="true" />
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Rechazar solicitud #{rechazando.id}</h2>
              <button onClick={() => setRechazando(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Cerrar"><CloseIcon /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-600">Indique por qué se rechaza la solicitud de <span className="font-medium text-slate-900">{rechazando.usuario.nombre}</span>. La sección verá el motivo y el detalle.</p>
              {actionError && <Alert type="error" onClose={() => setActionError("")}>{actionError}</Alert>}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="motivo-rechazo" className="text-sm font-medium text-slate-700">Motivo *</label>
                <select
                  id="motivo-rechazo"
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  className={`${inputClass} bg-white cursor-pointer`}
                >
                  <option value="">Seleccionar motivo...</option>
                  {MOTIVOS_RECHAZO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="razon-rechazo" className="text-sm font-medium text-slate-700">
                  Detalle {motivoRechazo === "OTRO" ? "*" : "(opcional)"}
                </label>
                <textarea
                  id="razon-rechazo"
                  rows={3}
                  value={razonRechazo}
                  onChange={(e) => setRazonRechazo(e.target.value)}
                  maxLength={500}
                  placeholder="Ej. Las tiendas grandes ya están apartadas para el campamento de Tropa"
                  className={`${inputClass} resize-none placeholder:text-slate-400`}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setRechazando(null)} disabled={isActing}>Cancelar</Button>
              <Button variant="danger" size="sm" onClick={handleRechazar} isLoading={isActing}>Rechazar solicitud</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Entregar Confirmation ── */}
      <Modal
        isOpen={!!entregando}
        title="Registrar entrega"
        onClose={() => setEntregando(null)}
        onConfirm={handleEntregar}
        confirmText="Confirmar entrega"
        cancelText="Cancelar"
        isLoading={isActing}
      >
        {actionError && <Alert type="error" onClose={() => setActionError("")}>{actionError}</Alert>}
        <p className="text-slate-600">
          ¿Confirma que <span className="font-medium text-slate-900">{entregando?.usuario.nombre}</span> retiró los materiales de la solicitud{" "}
          <span className="font-medium text-slate-900">#{entregando?.id}</span>?
        </p>
        <ul className="mt-2 text-sm text-slate-600 list-disc list-inside">
          {entregando?.detalles.map((d) => <li key={d.id}>{d.material.nombre} ×{d.cantidad}</li>)}
        </ul>
      </Modal>

      {/* ── Cancelar Confirmation ── */}
      <Modal
        isOpen={!!cancelando}
        title="Cancelar préstamo aprobado"
        onClose={() => setCancelando(null)}
        onConfirm={handleCancelar}
        confirmText="Sí, cancelar"
        cancelText="No"
        isLoading={isActing}
        variant="danger"
      >
        {actionError && <Alert type="error" onClose={() => setActionError("")}>{actionError}</Alert>}
        <p className="text-slate-600">
          Se liberará la reserva de la solicitud <span className="font-medium text-slate-900">#{cancelando?.id}</span> de{" "}
          <span className="font-medium text-slate-900">{cancelando?.usuario.nombre}</span>. Esta acción no se puede deshacer.
        </p>
      </Modal>

      {/* ── Devolver Modal (revisión del material) ── */}
      {devolviendo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDevolviendo(null)} aria-hidden="true" />
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Recibir devolución #{devolviendo.id}</h2>
              <button onClick={() => setDevolviendo(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Cerrar"><CloseIcon /></button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <p className="text-sm text-slate-600">
                Revise cada material de <span className="font-medium text-slate-900">{devolviendo.usuario.nombre}</span>.
                Las unidades dañadas pasan a mantenimiento y las faltantes se descuentan del inventario.
              </p>
              {actionError && <Alert type="error" onClose={() => setActionError("")}>{actionError}</Alert>}
              <div className="space-y-3">
                {devolviendo.detalles.map((d) => {
                  const r = revision[d.id] ?? { cantidadDanada: 0, cantidadFaltante: 0, observaciones: "" };
                  const buenas = d.cantidad - r.cantidadDanada - r.cantidadFaltante;
                  return (
                    <div key={d.id} className={`p-3 rounded-lg border ${buenas < 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-900">{d.material.nombre} ×{d.cantidad}</p>
                        <p className={`text-xs font-medium ${buenas < 0 ? "text-red-700" : "text-green-700"}`}>
                          En buen estado: {Math.max(0, buenas)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-xs text-slate-600">
                          Dañadas
                          <input
                            type="number"
                            min={0}
                            max={d.cantidad}
                            value={r.cantidadDanada}
                            onChange={(e) => updateRevision(d.id, "cantidadDanada", Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className={`${inputClass} mt-1`}
                          />
                        </label>
                        <label className="text-xs text-slate-600">
                          Faltantes
                          <input
                            type="number"
                            min={0}
                            max={d.cantidad}
                            value={r.cantidadFaltante}
                            onChange={(e) => updateRevision(d.id, "cantidadFaltante", Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className={`${inputClass} mt-1`}
                          />
                        </label>
                      </div>
                      {(r.cantidadDanada > 0 || r.cantidadFaltante > 0) && (
                        <input
                          value={r.observaciones}
                          onChange={(e) => updateRevision(d.id, "observaciones", e.target.value)}
                          placeholder="Detalle del daño o faltante..."
                          maxLength={300}
                          className={`${inputClass} mt-2`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="obs-devolucion" className="text-sm font-medium text-slate-700">Observaciones generales</label>
                <textarea
                  id="obs-devolucion"
                  rows={2}
                  value={observacionesDevolucion}
                  onChange={(e) => setObservacionesDevolucion(e.target.value)}
                  maxLength={500}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setDevolviendo(null)} disabled={isActing}>Cancelar</Button>
              <Button size="sm" onClick={handleDevolver} isLoading={isActing}>Registrar devolución</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
