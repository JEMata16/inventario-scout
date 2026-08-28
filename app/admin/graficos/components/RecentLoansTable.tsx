"use client";

import React, { useState } from "react";

interface LoanRecord {
  id: number;
  usuarioNombre: string;
  usuarioEmail: string;
  materiales: string;
  fechaSolicitud: Date;
  estado: string;
  razonRechazo?: string;
}

interface RecentLoansTableProps {
  data: LoanRecord[];
  total: number;
  isLoading?: boolean;
}

const getStatusBadge = (estado: string) => {
  switch (estado) {
    case "PENDIENTE":
      return {
        label: "Por Revisar",
        color: "bg-amber-50 text-amber-700 border border-amber-200",
      };
    case "APROBADA":
      return {
        label: "Aprobada",
        color: "bg-green-50 text-green-700 border border-green-200",
      };
    case "DEVUELTO":
      return {
        label: "Devuelto",
        color: "bg-sky-50 text-sky-700 border border-sky-200",
      };
    case "RECHAZADA":
      return {
        label: "Rechazada",
        color: "bg-red-50 text-red-700 border border-red-200",
      };
    default:
      return {
        label: estado,
        color: "bg-slate-50 text-slate-700 border border-slate-200",
      };
  }
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString("es-CR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function RecentLoansTable({ data, total, isLoading = false }: RecentLoansTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(total / pageSize);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Solicitudes Recientes
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Total de {total} solicitudes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">
              Mostrar:
            </label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                Materiales
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                Detalles
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-slate-500">Cargando...</span>
                  </div>
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((loan) => {
                const status = getStatusBadge(loan.estado);
                return (
                  <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {loan.usuarioNombre}
                        </p>
                        <p className="text-xs text-slate-500">{loan.usuarioEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900 max-w-xs truncate" title={loan.materiales}>
                        {loan.materiales}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">
                        {formatDate(loan.fechaSolicitud)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {loan.razonRechazo ? (
                        <div className="text-xs">
                          <p className="text-slate-600 font-medium">Razón:</p>
                          <p className="text-slate-500 mt-1">{loan.razonRechazo}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">—</p>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <p className="text-slate-500">No hay solicitudes disponibles</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Página <span className="font-medium">{currentPage}</span> de{" "}
            <span className="font-medium">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
