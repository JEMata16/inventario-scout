"use client";

import { useCallback, useEffect, useState } from "react";

interface Material {
  id: number;
  nombre: string;
  descripcion?: string | null;
  cantidad: number;
  categoria?: string | null;
  estado: string;
  hasImagen?: boolean;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const LIMIT = 12;

export function MaterialesCatalogo() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: LIMIT, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [categorias, setCategorias] = useState<string[]>([]);

  const fetchMateriales = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(LIMIT),
      estado: "DISPONIBLE",
      ...(search && { search }),
      ...(filterCategoria && { categoria: filterCategoria }),
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
  }, [currentPage, search, filterCategoria]);

  // Fetch available categories once for filter dropdown
  useEffect(() => {
    fetch("/api/materiales?limit=100&estado=DISPONIBLE")
      .then((r) => r.json())
      .then((data) => {
        if (data.materiales) {
          const cats = Array.from(
            new Set<string>(
              data.materiales
                .map((m: Material) => m.categoria)
                .filter(Boolean) as string[]
            )
          ).sort();
          setCategorias(cats);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchMateriales();
  }, [fetchMateriales]);

  // Reset page on filter change
  useEffect(() => {
    const t = setTimeout(() => setCurrentPage(1), 300);
    return () => clearTimeout(t);
  }, [search, filterCategoria]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9z" clipRule="evenodd" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por nombre, descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors placeholder:text-slate-400"
          />
        </div>

        {categorias.length > 0 && (
          <select
            value={filterCategoria}
            onChange={(e) => { setFilterCategoria(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-slate-400 transition-colors cursor-pointer"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      {/* Grid / skeleton / empty state */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
              <div className="aspect-video bg-slate-100" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-1/3" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : materiales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <svg className="w-12 h-12 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <p className="text-sm font-medium">
            {search || filterCategoria ? "Sin resultados para la búsqueda" : "No hay materiales disponibles"}
          </p>
          {(search || filterCategoria) && (
            <button
              onClick={() => { setSearch(""); setFilterCategoria(""); }}
              className="mt-3 text-xs text-green-600 hover:text-green-700 underline cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {materiales.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Image */}
              <div className="aspect-video bg-slate-100 overflow-hidden">
                {m.hasImagen ? (
                  <img
                    src={`/api/materiales/${m.id}/imagen`}
                    alt={m.nombre}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                {m.categoria && (
                  <span className="inline-block text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full mb-2">
                    {m.categoria}
                  </span>
                )}
                <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">{m.nombre}</h3>
                {m.descripcion && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{m.descripcion}</p>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{m.cantidad}</span> disponible{m.cantidad !== 1 ? "s" : ""}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />
                    Disponible
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Mostrando {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              aria-label="Página anterior"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
              </svg>
            </button>
            <span className="px-2 text-xs text-slate-600">{currentPage} / {pagination.totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage === pagination.totalPages}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              aria-label="Página siguiente"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {!isLoading && pagination.total > 0 && (
        <p className="text-xs text-slate-400 mt-3">
          {pagination.total} {pagination.total === 1 ? "material disponible" : "materiales disponibles"}
        </p>
      )}
    </div>
  );
}
