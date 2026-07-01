"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Modal } from "@/components/common";
import { MaterialForm, type MaterialData } from "./MaterialForm";

const ESTADO_LABELS: Record<string, { label: string; classes: string }> = {
  DISPONIBLE: { label: "Disponible", classes: "bg-green-100 text-green-700" },
  NO_DISPONIBLE: { label: "No disponible", classes: "bg-red-100 text-red-700" },
  EN_MANTENIMIENTO: { label: "En mantenimiento", classes: "bg-amber-100 text-amber-700" },
};

const ESTADO_FILTER_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "NO_DISPONIBLE", label: "No disponible" },
  { value: "EN_MANTENIMIENTO", label: "En mantenimiento" },
];

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function MaterialesManager() {
  const [materiales, setMateriales] = useState<MaterialData[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialData | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<MaterialData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMateriales = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: "10",
      ...(search && { search }),
      ...(filterEstado && { estado: filterEstado }),
    });
    try {
      const res = await fetch(`/api/materiales?${params}`);
      const data = await res.json();
      if (res.ok) {
        setMateriales(data.materiales);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, filterEstado]);

  useEffect(() => {
    fetchMateriales();
  }, [fetchMateriales]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setCurrentPage(1), 300);
    return () => clearTimeout(t);
  }, [search, filterEstado]);

  function openCreate() {
    setEditingMaterial(null);
    setIsFormOpen(true);
  }

  function openEdit(m: MaterialData) {
    setEditingMaterial(m);
    setIsFormOpen(true);
  }

  function handleFormSuccess(saved: MaterialData) {
    setIsFormOpen(false);
    setEditingMaterial(null);
    fetchMateriales();
  }

  async function handleDelete() {
    if (!deletingMaterial) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/materiales/${deletingMaterial.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeletingMaterial(null);
        fetchMateriales();
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9z" clipRule="evenodd" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por nombre, categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors placeholder:text-slate-400"
          />
        </div>

        {/* Estado filter */}
        <select
          value={filterEstado}
          onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors cursor-pointer"
        >
          {ESTADO_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <Button onClick={openCreate} size="sm">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
          </svg>
          Agregar material
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-16">Imagen</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Categoría</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Cantidad</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {[16, 48, 24, 12, 20, 16].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className={`h-4 bg-slate-100 rounded animate-pulse w-${w}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : materiales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                      <p className="text-sm font-medium">
                        {search || filterEstado ? "Sin resultados para la búsqueda" : "No hay materiales registrados"}
                      </p>
                      {!search && !filterEstado && (
                        <Button size="sm" variant="outline" onClick={openCreate}>
                          Agregar primer material
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                materiales.map((m) => {
                  const badge = ESTADO_LABELS[m.estado] ?? ESTADO_LABELS.NO_DISPONIBLE;
                  return (
                    <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        {m.imagen ? (
                          <img
                            src={m.imagen}
                            alt={m.nombre}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                            <svg className="w-5 h-5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{m.nombre}</p>
                        {m.descripcion && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{m.descripcion}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                        {m.categoria ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{m.cantidad}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEdit(m)}
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65z" />
                              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeletingMaterial(m)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Mostrando {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
                </svg>
              </button>
              <span className="px-2 text-xs text-slate-600">
                {currentPage} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {!isLoading && (
        <p className="text-xs text-slate-400 mt-3">
          {pagination.total} {pagination.total === 1 ? "material registrado" : "materiales registrados"}
        </p>
      )}

      {/* Form modal */}
      {isFormOpen && (
        <MaterialForm
          material={editingMaterial}
          onSuccess={handleFormSuccess}
          onCancel={() => { setIsFormOpen(false); setEditingMaterial(null); }}
        />
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deletingMaterial}
        title="Eliminar material"
        onClose={() => setDeletingMaterial(null)}
        onConfirm={handleDelete}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isLoading={isDeleting}
        variant="danger"
      >
        <p className="text-slate-600">
          ¿Seguro que desea eliminar <span className="font-medium text-slate-900">{deletingMaterial?.nombre}</span>?
          {deletingMaterial && (
            <span className="block text-xs text-slate-400 mt-1">
              Si el material tiene préstamos asociados, se marcará como no disponible en lugar de eliminarse.
            </span>
          )}
        </p>
      </Modal>
    </div>
  );
}