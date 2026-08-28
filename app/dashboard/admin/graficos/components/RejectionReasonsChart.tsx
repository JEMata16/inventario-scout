"use client";

import React, { memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RejectionData {
  razon: string;
  count: number;
}

interface RejectionReasonsChartProps {
  data: RejectionData[];
}

const RejectionReasonsChart = memo(({ data }: RejectionReasonsChartProps) => {
  const chartData = data.map((item) => ({
    name: item.razon.length > 20 ? item.razon.substring(0, 20) + "..." : item.razon,
    fullName: item.razon,
    value: item.count,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          Razones de Rechazo
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Top 5 motivos de rechazo de solicitudes
        </p>
      </div>

      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              style={{ fontSize: "12px" }}
              tick={{ fill: "#64748b" }}
              angle={-45}
              textAnchor="end"
              height={80}
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
              cursor={{ fill: "rgba(239, 68, 68, 0.05)" }}
              formatter={(value: any) => [`${value} rechazos`, "Rechazos"]}
              labelFormatter={(label) => {
                const item = chartData.find((d) => d.name === label);
                return item ? item.fullName : label;
              }}
            />
            <Bar dataKey="value" fill="#ef4444" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg">
          <p className="text-slate-500">No hay datos de rechazo disponibles</p>
        </div>
      )}
    </div>
  );
});

RejectionReasonsChart.displayName = "RejectionReasonsChart";

export default RejectionReasonsChart;
