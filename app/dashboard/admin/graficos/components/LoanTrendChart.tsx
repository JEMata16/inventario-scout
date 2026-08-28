"use client";

import React, { memo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TrendData {
  date: string;
  solicitudes: number;
}

interface LoanTrendChartProps {
  data: TrendData[];
  timeRange?: "month" | "quarter" | "year";
}

const LoanTrendChart = memo(({ data, timeRange = "month" }: LoanTrendChartProps) => {
  const getRangeLabel = () => {
    switch (timeRange) {
      case "quarter":
        return "últimos 90 días";
      case "year":
        return "últimos 365 días";
      default:
        return "últimos 30 días";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          Solicitudes de Préstamo ({getRangeLabel()})
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Tendencia de nuevas solicitudes en el periodo
        </p>
      </div>

      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorSolicitudes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              style={{ fontSize: "12px" }}
              tick={{ fill: "#64748b" }}
            />
            <YAxis
              stroke="#94a3b8"
              style={{ fontSize: "12px" }}
              tick={{ fill: "#64748b" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
              cursor={{ fill: "rgba(22, 163, 74, 0.05)" }}
              formatter={(value: any) => [`${value} solicitudes`, "Solicitudes"]}
              labelFormatter={(label) => `Fecha: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="solicitudes"
              stroke="#16a34a"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSolicitudes)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg">
          <p className="text-slate-500">No hay datos disponibles</p>
        </div>
      )}
    </div>
  );
});

LoanTrendChart.displayName = "LoanTrendChart";

export default LoanTrendChart;
