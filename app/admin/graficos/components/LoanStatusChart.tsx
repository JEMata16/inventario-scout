"use client";

import React, { memo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface StatusData {
  nombre: string;
  value: number;
}

interface LoanStatusChartProps {
  data: StatusData[];
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case "PENDIENTE":
      return "#f59e0b";
    case "APROBADA":
      return "#22c55e";
    case "DEVUELTO":
      return "#0ea5e9";
    case "RECHAZADA":
      return "#ef4444";
    default:
      return "#cbd5e1";
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case "PENDIENTE":
      return "Por Revisar";
    case "APROBADA":
      return "Aprobadas";
    case "DEVUELTO":
      return "Devueltas";
    case "RECHAZADA":
      return "Rechazadas";
    default:
      return status;
  }
};

const LoanStatusChart = memo(({ data }: LoanStatusChartProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const chartData = data.map((item) => ({
    ...item,
    label: getStatusLabel(item.nombre),
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          Estado de Préstamos
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Distribución de solicitudes por estado
        </p>
      </div>

      {data && data.length > 0 && total > 0 ? (
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.nombre)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value: any) => {
                  const percentage = ((value / total) * 100).toFixed(1);
                  return [`${value} (${percentage}%)`, "Solicitudes"];
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-6 flex flex-col items-center justify-center">
            <p className="text-4xl font-bold text-slate-900">{total}</p>
            <p className="text-sm text-slate-500 mt-1">Total de Solicitudes</p>
          </div>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
            {chartData.map((item) => (
              <div key={item.nombre} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getStatusColor(item.nombre) }}
                ></div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-900">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-500">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg">
          <p className="text-slate-500">No hay datos disponibles</p>
        </div>
      )}
    </div>
  );
});

LoanStatusChart.displayName = "LoanStatusChart";

export default LoanStatusChart;
