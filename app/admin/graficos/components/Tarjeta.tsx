import type { ReactNode } from "react";

/** Contenedor de cada bloque del reporte. Al imprimir no se parte entre hojas, salvo `partible`. */
export function Tarjeta({
  titulo,
  descripcion,
  acciones,
  children,
  className = "",
  partible = false,
}: {
  titulo: string;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Permite partir la tarjeta entre hojas al imprimir (tablas largas) */
  partible?: boolean;
}) {
  return (
    <section
      className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 print:shadow-none print:p-3 ${partible ? "" : "break-inside-avoid"} ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4 break-after-avoid">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
          {descripcion && <p className="text-xs text-slate-500 mt-0.5">{descripcion}</p>}
        </div>
        {acciones && <div className="print:hidden">{acciones}</div>}
      </div>
      {children}
    </section>
  );
}

export function SinDatos({ children = "No hay datos para este período." }: { children?: ReactNode }) {
  return (
    <div className="flex items-center justify-center h-32 rounded-lg bg-slate-50 text-sm text-slate-500 text-center px-4">
      {children}
    </div>
  );
}

/** Colores de los gráficos (paleta categórica validada; ver lib/constantes.ts) */
export const COLOR_SERIE = "#2a78d6";
export const COLOR_GRILLA = "#e2e8f0";
export const COLOR_TEXTO_EJE = "#64748b";

export const estiloTooltip = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.08)",
  fontSize: "12px",
};
