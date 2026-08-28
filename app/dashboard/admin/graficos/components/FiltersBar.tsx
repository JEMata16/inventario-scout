"use client";

import React, { useState } from "react";

interface FiltersBarProps {
  onFilterChange?: (filters: any) => void;
  isLoading?: boolean;
}

export default function FiltersBar({ onFilterChange, isLoading = false }: FiltersBarProps) {
  const [timeRange, setTimeRange] = useState("30");
  const [status, setStatus] = useState("");

  const handleTimeRangeChange = (days: string) => {
    setTimeRange(days);
    onFilterChange?.({ timeRange: parseInt(days), status });
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    onFilterChange?.({ timeRange: parseInt(timeRange), status: newStatus });
  };

  const getTimeRangeLabel = (days: string) => {
    switch (days) {
      case "30":
        return "Últimos 30 días";
      case "90":
        return "Últimos 90 días";
      case "365":
        return "Último año";
      default:
        return "Últimos 30 días";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-900">Filtros</h3>
        {isLoading && (
          <span className="text-xs text-slate-500 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            Actualizando...
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Time Range Filter */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-2">
            Período
          </label>
          <div className="flex gap-2">
            {["30", "90", "365"].map((days) => (
              <button
                key={days}
                onClick={() => handleTimeRangeChange(days)}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  timeRange === days
                    ? "bg-green-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {getTimeRangeLabel(days)}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-2">
            Estado
          </label>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Por Revisar</option>
            <option value="APROBADA">Aprobadas</option>
            <option value="DEVUELTO">Devueltas</option>
            <option value="RECHAZADA">Rechazadas</option>
          </select>
        </div>

        {/* Refresh Button */}
        <div className="flex items-end">
          <button
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Actualizar
          </button>
        </div>
      </div>
    </div>
  );
}
