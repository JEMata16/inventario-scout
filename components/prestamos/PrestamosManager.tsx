"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Alert, Modal } from "@/components/common";

// ── Types ────────────────────────────────────────────────────────────────────

interface DetallePrestamo {
  id: number;
  materialId: number;
  cantidad: number;
  material: { nombre: string; imagen?: string | null; categoria?: string | null };
}

interface SolicitudPrestamo {
  id: number;
  usuarioId: number;
  estado: string;
  fechaSolicitud: string;
  fechaAprobacion?: string | null;
  fechaRechazo?: string | null;
  fechaDevolucionEsperada?: string | null;
  fechaDevolucionReal?: string | null;
  razonRechazo?: string | null;
  usuario: { nombre: string; apellido?: string | null; email: string };
  detalles: DetallePrestamo[];
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ESTADO_LABELS: Record<string, { label: string; classes: string }> = {
  PENDIENTE: { label: "Pendiente", classes: "bg-amber-100 text-amber-700" },
  APROBADA: { label: "Aprobada", classes: "bg-green-100 text-green-700" },
  RECHAZADA: { label: "Rechazada", classes: "bg-red-100 text-red-700" },
  DEVUELTO: { label: "Devuelto", classes: "bg-slate-100 text-slate-600" },
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

function nombreCompleto(u: SolicitudPrestamo["usuario"]) {
  return `${u.nombre}${u.apellido ? " " + u.apellido : ""}`;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ── Component ────────────────────────────────────────────────────────────────

export function PrestamosManager() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPrestamo[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");

  // Modal state
  const [viewing, setViewing] = useState<SolicitudPrestamo | null>(null);
  const [aprobando, setAprobando] = useState<SolicitudPrestamo | null>(null);
  const [rechazando, setRechazando] = useState<SolicitudPrestamo | null>(null);
  const [devolviendo, setDevolviendo] = useState<SolicitudPrestamo | null>(null);

  // Action form state
  const [fechaDevolucion, setFechaDevolucion] = useState("");
  const [razonRechazo, setRazonRechazo] = useState("");
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
  }, [currentPage, search, filterEstado]);

  useEffect(() => { fetchSolicitudes(); }, [fetchSolicitudes]);

  useEffect(() => {
    const t = setTimeout(() => setCurrentPage(1), 300);
    return () => clearTimeout(t);
  }, [search, filterEstado]);

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleAprobar() {
    if (!aprobando || !fechaDevolucion) { setActionError("Seleccione una fecha de devolución"); return; }
    setIsActing(true);
    setActionError("");
    try {
      const res = await fetch(`/api/prestamos/${aprobando.id}/aprobar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechaDevolucionEsperada: fechaDevolucion }),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error ?? "Error al aprobar"); return; }
      setAprobando(null);
      setFechaDevolucion("");
      fetchSolicitudes();
    } catch { setActionError("Error de conexión"); }
    finally { setIsActing(false); }
  }

  async function handleRechazar() {
    if (!rechazando || razonRechazo.trim().length < 5) { setActionError("La razón debe tener al menos 5 caracteres"); return; }
    setIsActing(true);
    setActionError("");
    try {
      const res = await fetch(`/api/prestamos/${rechazando.id}/rechazar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ razon: razonRechazo }),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error ?? "Error al rechazar"); return; }
      setRechazando(null);
      setRazonRechazo("");
      fetchSolicitudes();
    } catch { setActionError("Error de conexión"); }
    finally { setIsActing(false); }
  }

  async function handleDevolver() {
    if (!devolviendo) return;
    setIsActing(true);
    setActionError("");
    try {
      const res = await fetch(`/api/prestamos/${devolviendo.id}/devolver`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error ?? "Error"); return; }
      setDevolviendo(null);
      fetchSolicitudes();
    } catch { setActionError("Error de conexión"); }
    finally { setIsActing(false); }
  }

  function openAprobar(s: SolicitudPrestamo) { setAprobando(s); setFechaDevolucion(""); setActionError(""); }
  function openRechazar(s: SolicitudPrestamo) { setRechazando(s); setRazonRechazo(""); setActionError(""); }
  function openDevolver(s: SolicitudPrestamo) { setDevolviendo(s); setActionError(""); }

  // ── Render ────────────────────────────────────────────────────────────────

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
            placeholder="Buscar por nombre o correo del usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors placeholder:text-slate-400"
          />
        </div>
        <select
          value={filterEstado}
          onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors cursor-pointer"
        >
          {ESTADO_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
                <th className="text-left px-4 py-3 font-medium text-slate-600">Solicitante</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Materiales</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Fecha solicitud</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Retorno esp.</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {[8, 32, 40, 24, 20, 20, 16].map((w, j) => (
                      <td key={j} className="px-4 py-3 hidden-col">
                        <div className={`h-4 bg-slate-100 rounded animate-pulse w-${w}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : solicitudes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                      </svg>
                      <p className="text-sm font-medium">
                        {search || filterEstado ? "Sin resultados para la búsqueda" : "No hay solicitudes de préstamo"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                solicitudes.map((s) => {
                  const badge = ESTADO_LABELS[s.estado] ?? ESTADO_LABELS.PENDIENTE;
                  return (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-400 text-xs font-mono">#{s.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{nombreCompleto(s.usuario)}</p>
                        <p className="text-xs text-slate-400">{s.usuario.email}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-600 text-xs">
                        <span className="font-medium">{s.detalles.length} ítem{s.detalles.length !== 1 ? "s" : ""}</span>
                        <p className="text-slate-400 line-clamp-1">
                          {s.detalles.map((d) => d.material.nombre).join(", ")}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">{formatDate(s.fechaSolicitud)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">{formatDate(s.fechaDevolucionEsperada)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Detail */}
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
                          {/* PENDIENTE: Aprobar + Rechazar */}
                          {s.estado === "PENDIENTE" && (
                            <>
                              <button
                                onClick={() => openAprobar(s)}
                                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors cursor-pointer"
                                title="Aprobar"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button
                                onClick={() => openRechazar(s)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                title="Rechazar"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                              </button>
                            </>
                          )}
                          {/* APROBADA: Devuelto */}
                          {s.estado === "APROBADA" && (
                            <button
                              onClick={() => openDevolver(s)}
                              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors cursor-pointer"
                              title="Marcar como devuelto"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025z" clipRule="evenodd" />
                              </svg>
                            </button>
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
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" /></svg>
              </button>
              <span className="px-2 text-xs text-slate-600">{currentPage} / {pagination.totalPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={currentPage === pagination.totalPages} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
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
              <button onClick={() => setViewing(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" aria-label="Cerrar">
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-5">
              {/* Solicitante */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Solicitante</p>
                <p className="text-sm font-medium text-slate-900">{nombreCompleto(viewing.usuario)}</p>
                <p className="text-xs text-slate-500">{viewing.usuario.email}</p>
              </div>
              {/* Estado */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Estado</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ESTADO_LABELS[viewing.estado]?.classes}`}>
                  {ESTADO_LABELS[viewing.estado]?.label}
                </span>
              </div>
              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-400">Solicitado</span><p className="font-medium text-slate-700">{formatDate(viewing.fechaSolicitud)}</p></div>
                {viewing.fechaAprobacion && <div><span className="text-slate-400">Aprobado</span><p className="font-medium text-slate-700">{formatDate(viewing.fechaAprobacion)}</p></div>}
                {viewing.fechaDevolucionEsperada && <div><span className="text-slate-400">Retorno esperado</span><p className="font-medium text-slate-700">{formatDate(viewing.fechaDevolucionEsperada)}</p></div>}
                {viewing.fechaDevolucionReal && <div><span className="text-slate-400">Devuelto el</span><p className="font-medium text-slate-700">{formatDate(viewing.fechaDevolucionReal)}</p></div>}
                {viewing.fechaRechazo && <div><span className="text-slate-400">Rechazado</span><p className="font-medium text-slate-700">{formatDate(viewing.fechaRechazo)}</p></div>}
              </div>
              {/* Rejection reason */}
              {viewing.razonRechazo && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Razón de rechazo</p>
                  <p className="text-sm text-red-800">{viewing.razonRechazo}</p>
                </div>
              )}
              {/* Materials */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Materiales solicitados</p>
                <div className="space-y-2">
                  {viewing.detalles.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      {d.material.imagen ? (
                        <img src={d.material.imagen} alt={d.material.nombre} className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" /></svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{d.material.nombre}</p>
                        {d.material.categoria && <p className="text-xs text-slate-400">{d.material.categoria}</p>}
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

      {/* ── Aprobar Modal ── */}
      {aprobando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setAprobando(null)} aria-hidden="true" />
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Aprobar solicitud #{aprobando.id}</h2>
              <button onClick={() => setAprobando(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Cerrar">
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-600">Solicitud de <span className="font-medium text-slate-900">{nombreCompleto(aprobando.usuario)}</span> con {aprobando.detalles.length} ítem{aprobando.detalles.length !== 1 ? "s" : ""}.</p>
              {actionError && <Alert type="error" onClose={() => setActionError("")}>{actionError}</Alert>}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="fecha-devolucion" className="text-sm font-medium text-slate-700">Fecha de devolución *</label>
                <input
                  id="fecha-devolucion"
                  type="date"
                  min={todayISO()}
                  value={fechaDevolucion}
                  onChange={(e) => setFechaDevolucion(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setAprobando(null)} disabled={isActing}>Cancelar</Button>
              <Button size="sm" onClick={handleAprobar} isLoading={isActing}>Aprobar solicitud</Button>
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
              <button onClick={() => setRechazando(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Cerrar">
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-600">Indique la razón del rechazo para <span className="font-medium text-slate-900">{nombreCompleto(rechazando.usuario)}</span>.</p>
              {actionError && <Alert type="error" onClose={() => setActionError("")}>{actionError}</Alert>}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="razon-rechazo" className="text-sm font-medium text-slate-700">Razón de rechazo *</label>
                <textarea
                  id="razon-rechazo"
                  rows={3}
                  value={razonRechazo}
                  onChange={(e) => setRazonRechazo(e.target.value)}
                  placeholder="Indique el motivo del rechazo..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors placeholder:text-slate-400"
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

      {/* ── Devolver Confirmation ── */}
      <Modal
        isOpen={!!devolviendo}
        title="Confirmar devolución"
        onClose={() => setDevolviendo(null)}
        onConfirm={handleDevolver}
        confirmText="Marcar como devuelto"
        cancelText="Cancelar"
        isLoading={isActing}
      >
        <p className="text-slate-600">
          ¿Confirma que los materiales de la solicitud{" "}
          <span className="font-medium text-slate-900">#{devolviendo?.id}</span> han sido devueltos?
          <span className="block text-xs text-slate-400 mt-1">
            Las cantidades de los materiales serán restauradas al inventario.
          </span>
        </p>
      </Modal>
    </div>
  );
}
