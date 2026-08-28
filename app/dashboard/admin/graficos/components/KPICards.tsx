"use client";

import React from "react";

interface KPIData {
  materialesDisponibles: number;
  prestamosActivos: number;
  tasaAprobacion: number;
  tasaDevoluciones: number;
  trends?: {
    materiales?: number;
  };
}

interface KPICardsProps {
  data: KPIData;
}

const KPICard = ({
  label,
  value,
  trend,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  color: "green" | "amber" | "sky" | "red";
}) => {
  const colorClasses = {
    green: { bg: "bg-green-50", text: "text-green-700", border: "border-green-500", icon: "bg-green-100 text-green-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-500", icon: "bg-amber-100 text-amber-600" },
    sky: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-500", icon: "bg-sky-100 text-sky-600" },
    red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-500", icon: "bg-red-100 text-red-600" },
  };

  const classes = colorClasses[color];
  const trendUp = trend !== undefined && trend >= 0;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 ${classes.border} p-6`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          {trend !== undefined && (
            <p className={`text-xs mt-2 ${trendUp ? "text-green-600" : "text-red-600"}`}>
              {trendUp ? "↑" : "↓"} {Math.abs(trend)}% vs período anterior
            </p>
          )}
        </div>
        <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${classes.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default function KPICards({ data }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <KPICard
        label="Materiales Disponibles"
        value={data.materialesDisponibles}
        trend={data.trends?.materiales}
        color="green"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        }
      />

      <KPICard
        label="Préstamos Activos"
        value={data.prestamosActivos}
        color="amber"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
          </svg>
        }
      />

      <KPICard
        label="Tasa de Aprobación"
        value={`${data.tasaAprobacion}%`}
        color="sky"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        }
      />

      <KPICard
        label="Devoluciones a Tiempo"
        value={`${data.tasaDevoluciones}%`}
        color="green"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    </div>
  );
}
