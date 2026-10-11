"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLOR_SECCION, etiquetaSeccion, type Seccion } from "@/lib/constantes";
import type { PuntoSerie } from "@/lib/reportes/consultas";
import { COLOR_GRILLA, COLOR_TEXTO_EJE, estiloTooltip } from "./Tarjeta";

/** Solicitudes por día/semana/mes, apiladas por sección. El color sigue a la sección. */
export function GraficoSolicitudes({ datos, secciones }: { datos: PuntoSerie[]; secciones: Seccion[] }) {
  return (
    <div>
      {/* Leyenda: siempre visible, la identidad no depende solo del color */}
      {secciones.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-slate-600" aria-label="Leyenda">
          {secciones.map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR_SECCION[s] }} aria-hidden="true" />
              {etiquetaSeccion(s)}
            </li>
          ))}
        </ul>
      )}
      <div className="grafico" style={{ ["--alto-grafico" as string]: "260px" }}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={datos} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={COLOR_GRILLA} />
            <XAxis
              dataKey="etiqueta"
              tick={{ fill: COLOR_TEXTO_EJE, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: COLOR_GRILLA }}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis allowDecimals={false} tick={{ fill: COLOR_TEXTO_EJE, fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={estiloTooltip}
              cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
              formatter={(valor, nombre) => [`${valor} solicitud${valor === 1 ? "" : "es"}`, etiquetaSeccion(String(nombre))]}
            />
            {secciones.map((s, i) => (
              <Bar
                key={s}
                dataKey={s}
                stackId="secciones"
                fill={COLOR_SECCION[s]}
                stroke="#ffffff"
                strokeWidth={1}
                radius={i === secciones.length - 1 ? [4, 4, 0, 0] : 0}
                maxBarSize={40}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
