"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLOR_GRILLA, COLOR_SERIE, COLOR_TEXTO_EJE, estiloTooltip } from "./Tarjeta";

interface Fila {
  etiqueta: string;
  valor: number;
}

/**
 * Barras horizontales de una sola serie (un solo color), ordenadas de mayor a
 * menor, con el valor al final de cada barra. Para rankings de nombres largos.
 */
export function GraficoBarras({ datos, unidad }: { datos: Fila[]; unidad: [singular: string, plural: string] }) {
  const alto = Math.max(120, datos.length * 34 + 24);
  const corto = (s: string) => (s.length > 26 ? `${s.slice(0, 25)}…` : s);

  return (
    <div className="grafico" style={{ ["--alto-grafico" as string]: `${alto}px` }}>
      <ResponsiveContainer width="100%" height={alto}>
        <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke={COLOR_GRILLA} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: COLOR_TEXTO_EJE, fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="etiqueta"
            width={170}
            // Etiqueta de una sola línea (Recharts parte el texto largo en varias líneas)
            tick={({ x, y, payload }) => (
              <text x={x} y={y} dy={4} textAnchor="end" fill="#334155" fontSize={12}>
                <title>{payload.value}</title>
                {corto(String(payload.value))}
              </text>
            )}
            tickLine={false}
            axisLine={{ stroke: COLOR_GRILLA }}
          />
          <Tooltip
            contentStyle={estiloTooltip}
            cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
            formatter={(v) => [`${v} ${v === 1 ? unidad[0] : unidad[1]}`, ""]}
            separator=""
          />
          <Bar dataKey="valor" fill={COLOR_SERIE} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
            <LabelList dataKey="valor" position="right" fill="#334155" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
