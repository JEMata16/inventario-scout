import Link from "next/link";
import type { FranjaOperativa as Datos } from "@/lib/reportes/consultas";

/** "¿Qué tengo que atender hoy?" — estado actual, no depende de los filtros. */
export function FranjaOperativa({ datos }: { datos: Datos }) {
  const tarjetas = [
    {
      etiqueta: "Pendientes de revisar",
      valor: datos.pendientes,
      detalle: datos.pendientesConConflicto > 0 ? `${datos.pendientesConConflicto} con conflicto` : "sin conflictos",
      alerta: datos.pendientesConConflicto > 0,
      href: "/admin/prestamos?estado=PENDIENTE",
    },
    {
      etiqueta: "Por entregar",
      valor: datos.porEntregar,
      detalle: "la fecha de retiro ya llegó",
      alerta: false,
      href: "/admin/prestamos?estado=POR_ENTREGAR",
    },
    {
      etiqueta: "Devoluciones vencidas",
      valor: datos.vencidas,
      detalle: datos.vencidas > 0 ? "requieren seguimiento" : "todo al día",
      alerta: datos.vencidas > 0,
      href: "/admin/prestamos?estado=VENCIDAS",
    },
    {
      etiqueta: "Retiros próximos 7 días",
      valor: datos.retirosProximos,
      detalle: "préstamos aprobados",
      alerta: false,
      href: "/admin/prestamos?estado=APROBADA",
    },
    {
      etiqueta: "Unidades en mantenimiento",
      valor: datos.unidadesMantenimiento,
      detalle: "no disponibles para préstamo",
      alerta: false,
      href: "/admin/materiales",
    },
  ];

  return (
    <section aria-label="Estado actual" className="mb-6 print:hidden">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Hoy</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {tarjetas.map((t) => (
          <Link
            key={t.etiqueta}
            href={t.href}
            className={`block bg-white rounded-xl border p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${
              t.alerta ? "border-red-200" : "border-slate-200"
            }`}
          >
            <p className="text-xs font-medium text-slate-500">{t.etiqueta}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{t.valor}</p>
            <p className={`text-xs mt-0.5 flex items-center gap-1 ${t.alerta ? "text-red-700 font-medium" : "text-slate-400"}`}>
              {t.alerta && <span aria-hidden="true">⚠</span>}
              {t.detalle}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
