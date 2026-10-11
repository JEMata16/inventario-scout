import type { Indicadores as Datos } from "@/lib/reportes/consultas";

/** "¿Cómo vamos?" — indicadores del período filtrado. */
export function Indicadores({ datos }: { datos: Datos }) {
  const items = [
    {
      etiqueta: "Solicitudes recibidas",
      valor: String(datos.recibidas),
      detalle: "en el período",
    },
    {
      etiqueta: "Tasa de aprobación",
      valor: datos.tasaAprobacion === null ? "—" : `${datos.tasaAprobacion}%`,
      detalle:
        datos.resueltas === 0
          ? "sin solicitudes resueltas"
          : `${datos.aprobadas} de ${datos.resueltas} resueltas (sin pendientes ni canceladas)`,
    },
    {
      etiqueta: "Devoluciones a tiempo",
      valor: datos.tasaATiempo === null ? "—" : `${datos.tasaATiempo}%`,
      detalle:
        datos.devoluciones === 0
          ? "sin devoluciones en el período"
          : `${datos.devolucionesATiempo} de ${datos.devoluciones} devoluciones`,
    },
    {
      etiqueta: "Unidades dañadas / perdidas",
      valor: `${datos.unidadesDanadas} / ${datos.unidadesPerdidas}`,
      detalle: "registradas al recibir devoluciones",
    },
  ];

  return (
    <section aria-label="Indicadores del período" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:grid-cols-4 print:gap-2">
      {items.map((i) => (
        <div key={i.etiqueta} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 break-inside-avoid print:shadow-none print:p-3">
          <p className="text-sm font-medium text-slate-600">{i.etiqueta}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 print:text-2xl">{i.valor}</p>
          <p className="text-xs text-slate-500 mt-1">{i.detalle}</p>
        </div>
      ))}
    </section>
  );
}
