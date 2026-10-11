// Consultas de los reportes de análisis (solo servidor).
//
// Qué fecha define "dentro del período" para cada métrica:
// - Solicitudes, aprobación, motivos de rechazo, serie temporal -> fechaSolicitud
// - Materiales más prestados, utilización -> el USO (retiro -> devolución) se traslapa con el período
// - Devoluciones a tiempo, daños y pérdidas -> fechaDevolucionReal
//
// El volumen de un grupo scout es bajo (cientos de solicitudes al año), así que
// se traen las filas del período y se agregan en TypeScript: las reglas de
// fechas (hora de Costa Rica, traslapes) quedan en funciones puras y probadas.

import { prisma } from "../db";
import { SECCIONES, etiquetaMotivoRechazo, etiquetaSeccion, type Seccion } from "../constantes";
import { clasificarConflictos } from "../disponibilidad";
import { aISO, hoyCR, sumarDias } from "../fechas";
import { diaCR, rangoInstantes, type FiltrosReporte } from "./filtros";
import {
  diasTraslapados,
  generarGrupos,
  granularidadPara,
  inicioGrupo,
  porcentaje,
  porcentajeUtilizacion,
  type Granularidad,
  type UsoMaterial,
} from "./calculos";

// ── Franja operativa (estado actual, no depende de los filtros) ──────────────

export interface FranjaOperativa {
  pendientes: number;
  pendientesConConflicto: number;
  porEntregar: number;
  vencidas: number;
  retirosProximos: number;
  unidadesMantenimiento: number;
}

export async function obtenerFranjaOperativa(): Promise<FranjaOperativa> {
  const hoy = hoyCR();
  const [pendientes, porEntregar, vencidas, retirosProximos, mantenimiento] = await Promise.all([
    prisma.solicitudPrestamo.findMany({
      where: { estado: "PENDIENTE" },
      select: {
        id: true,
        fechaRetiro: true,
        fechaDevolucionEsperada: true,
        detalles: { select: { materialId: true, cantidad: true } },
      },
    }),
    prisma.solicitudPrestamo.count({ where: { estado: "APROBADA", fechaRetiro: { lte: hoy } } }),
    prisma.solicitudPrestamo.count({ where: { estado: "ENTREGADA", fechaDevolucionEsperada: { lt: hoy } } }),
    prisma.solicitudPrestamo.count({
      where: { estado: "APROBADA", fechaRetiro: { gt: hoy, lte: sumarDias(hoy, 7) } },
    }),
    prisma.material.aggregate({ _sum: { cantidadMantenimiento: true } }),
  ]);
  const conflictos = await clasificarConflictos(prisma, pendientes);

  return {
    pendientes: pendientes.length,
    pendientesConConflicto: conflictos.size,
    porEntregar,
    vencidas,
    retirosProximos,
    unidadesMantenimiento: mantenimiento._sum.cantidadMantenimiento ?? 0,
  };
}

// ── Reporte del período ─────────────────────────────────────────────────────

export interface Indicadores {
  recibidas: number;
  aprobadas: number;
  resueltas: number;
  /** aprobadas ÷ resueltas (sin pendientes ni canceladas) */
  tasaAprobacion: number | null;
  devoluciones: number;
  devolucionesATiempo: number;
  tasaATiempo: number | null;
  unidadesDanadas: number;
  unidadesPerdidas: number;
}

export type PuntoSerie = { clave: string; etiqueta: string } & Record<Seccion, number>;

export interface ResumenSeccion {
  seccion: Seccion;
  nombre: string;
  solicitudes: number;
  aprobadas: number;
  rechazadas: number;
  canceladas: number;
  pendientes: number;
  devoluciones: number;
  tasaATiempo: number | null;
  danadas: number;
  perdidas: number;
}

export interface MaterialPrestado {
  id: number;
  nombre: string;
  unidades: number;
  prestamos: number;
}

export interface UtilizacionMaterial {
  id: number;
  nombre: string;
  categoria: string | null;
  unidadesUtilizables: number;
  porcentaje: number | null;
  /** Veces que una solicitud con este material se rechazó por Sin stock o Conflicto */
  rechazosPorStock: number;
}

export interface MotivoRechazoConteo {
  motivo: string;
  etiqueta: string;
  cantidad: number;
}

export interface DanoPerdida {
  solicitudId: number;
  material: string;
  seccion: string;
  responsable: string;
  fechaDevolucion: Date;
  danadas: number;
  perdidas: number;
  observaciones: string | null;
}

export interface Reporte {
  granularidad: Granularidad;
  /** Secciones incluidas (todas, o la del filtro) */
  secciones: Seccion[];
  indicadores: Indicadores;
  serie: PuntoSerie[];
  resumenSecciones: ResumenSeccion[];
  /** Todos los materiales prestados en el período, de más a menos unidades */
  materialesPrestados: MaterialPrestado[];
  utilizacion: UtilizacionMaterial[];
  motivosRechazo: MotivoRechazoConteo[];
  danos: DanoPerdida[];
}

const ESTADOS_CON_USO = ["APROBADA", "ENTREGADA", "DEVUELTA"];
const MOTIVOS_DE_STOCK = ["SIN_STOCK", "CONFLICTO"];

export async function obtenerReporte(f: FiltrosReporte): Promise<Reporte> {
  const { inicio, fin } = rangoInstantes(f);
  const hoy = hoyCR();
  const filtroSeccion = f.seccion ? { usuario: { seccion: f.seccion } } : {};
  const secciones: Seccion[] = f.seccion ? [f.seccion] : SECCIONES.map((s) => s.value);

  const [solicitudes, devueltas, usos, materiales] = await Promise.all([
    // Solicitudes hechas en el período
    prisma.solicitudPrestamo.findMany({
      where: { fechaSolicitud: { gte: inicio, lt: fin }, ...filtroSeccion },
      select: {
        estado: true,
        fechaSolicitud: true,
        fechaAprobacion: true,
        motivoRechazo: true,
        usuario: { select: { seccion: true } },
        detalles: { select: { materialId: true } },
      },
    }),
    // Devoluciones recibidas en el período
    prisma.solicitudPrestamo.findMany({
      where: { estado: "DEVUELTA", fechaDevolucionReal: { gte: inicio, lt: fin }, ...filtroSeccion },
      select: {
        id: true,
        responsable: true,
        fechaDevolucionEsperada: true,
        fechaDevolucionReal: true,
        usuario: { select: { seccion: true } },
        detalles: {
          select: {
            cantidadDanada: true,
            cantidadFaltante: true,
            observaciones: true,
            material: { select: { nombre: true } },
          },
        },
      },
      orderBy: { fechaDevolucionReal: "desc" },
    }),
    // Préstamos cuyo uso puede traslaparse con el período (se afina en TS)
    prisma.solicitudPrestamo.findMany({
      where: {
        estado: { in: ESTADOS_CON_USO },
        fechaRetiro: { lte: f.hasta },
        OR: [
          { fechaDevolucionEsperada: { gte: f.desde } },
          { estado: "ENTREGADA" },
          { estado: "DEVUELTA", fechaDevolucionReal: { gte: inicio } },
        ],
        ...filtroSeccion,
      },
      select: {
        estado: true,
        fechaRetiro: true,
        fechaDevolucionEsperada: true,
        fechaDevolucionReal: true,
        detalles: { select: { materialId: true, cantidad: true } },
      },
    }),
    prisma.material.findMany({
      where: { estado: { not: "NO_DISPONIBLE" } },
      select: { id: true, nombre: true, categoria: true, estado: true, cantidadTotal: true, cantidadMantenimiento: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  // ── Resumen por sección (base) ──
  const resumen = new Map<Seccion, ResumenSeccion>(
    secciones.map((s) => [
      s,
      {
        seccion: s,
        nombre: etiquetaSeccion(s),
        solicitudes: 0,
        aprobadas: 0,
        rechazadas: 0,
        canceladas: 0,
        pendientes: 0,
        devoluciones: 0,
        tasaATiempo: null,
        danadas: 0,
        perdidas: 0,
      },
    ])
  );
  const aTiempoPorSeccion = new Map<Seccion, number>();

  // ── Solicitudes: indicadores, serie, motivos, rechazos por stock ──
  const granularidad = granularidadPara(f.desde, f.hasta);
  const serie = new Map<string, PuntoSerie>(
    generarGrupos(f.desde, f.hasta, granularidad).map((g) => [
      g.clave,
      { ...g, MANADA: 0, TROPA: 0, WAK: 0, COMUNIDAD: 0 },
    ])
  );
  const motivos = new Map<string, number>();
  const rechazosPorStock = new Map<number, number>();
  let aprobadas = 0;
  let rechazadas = 0;

  for (const s of solicitudes) {
    const seccion = s.usuario.seccion as Seccion | null;
    const r = seccion ? resumen.get(seccion) : undefined;
    if (r) r.solicitudes++;

    if (seccion) {
      const punto = serie.get(aISO(inicioGrupo(diaCR(s.fechaSolicitud), granularidad)));
      if (punto) punto[seccion]++;
    }

    if (s.fechaAprobacion) {
      aprobadas++;
      if (r) r.aprobadas++;
    }
    if (s.estado === "RECHAZADA") {
      rechazadas++;
      if (r) r.rechazadas++;
      const motivo = s.motivoRechazo ?? "SIN_MOTIVO";
      motivos.set(motivo, (motivos.get(motivo) ?? 0) + 1);
      if (s.motivoRechazo && MOTIVOS_DE_STOCK.includes(s.motivoRechazo)) {
        for (const d of s.detalles) rechazosPorStock.set(d.materialId, (rechazosPorStock.get(d.materialId) ?? 0) + 1);
      }
    }
    if (s.estado === "CANCELADA" && r) r.canceladas++;
    if (s.estado === "PENDIENTE" && r) r.pendientes++;
  }

  // ── Devoluciones: a tiempo, daños y pérdidas ──
  let devolucionesATiempo = 0;
  let unidadesDanadas = 0;
  let unidadesPerdidas = 0;
  const danos: DanoPerdida[] = [];

  for (const d of devueltas) {
    const seccion = d.usuario.seccion as Seccion | null;
    const r = seccion ? resumen.get(seccion) : undefined;
    const aTiempo = d.fechaDevolucionReal !== null && diaCR(d.fechaDevolucionReal) <= d.fechaDevolucionEsperada;
    if (aTiempo) devolucionesATiempo++;
    if (r && seccion) {
      r.devoluciones++;
      if (aTiempo) aTiempoPorSeccion.set(seccion, (aTiempoPorSeccion.get(seccion) ?? 0) + 1);
    }
    for (const det of d.detalles) {
      unidadesDanadas += det.cantidadDanada;
      unidadesPerdidas += det.cantidadFaltante;
      if (r) {
        r.danadas += det.cantidadDanada;
        r.perdidas += det.cantidadFaltante;
      }
      if (det.cantidadDanada > 0 || det.cantidadFaltante > 0) {
        danos.push({
          solicitudId: d.id,
          material: det.material.nombre,
          seccion: etiquetaSeccion(seccion),
          responsable: d.responsable,
          fechaDevolucion: d.fechaDevolucionReal!,
          danadas: det.cantidadDanada,
          perdidas: det.cantidadFaltante,
          observaciones: det.observaciones,
        });
      }
    }
  }
  for (const r of resumen.values()) r.tasaATiempo = porcentaje(aTiempoPorSeccion.get(r.seccion) ?? 0, r.devoluciones);

  // ── Uso de materiales: más prestados y utilización ──
  const usosPorMaterial = new Map<number, UsoMaterial[]>();
  const prestados = new Map<number, { unidades: number; prestamos: number }>();

  for (const u of usos) {
    const inicioUso = u.fechaRetiro;
    let finUso: Date;
    if (u.estado === "DEVUELTA" && u.fechaDevolucionReal) {
      const real = diaCR(u.fechaDevolucionReal);
      finUso = real < inicioUso ? inicioUso : real;
    } else if (u.estado === "ENTREGADA" && u.fechaDevolucionEsperada < hoy) {
      finUso = hoy; // vencido: sigue afuera
    } else {
      finUso = u.fechaDevolucionEsperada;
    }
    if (diasTraslapados(inicioUso, finUso, f.desde, f.hasta) === 0) continue;

    for (const d of u.detalles) {
      const lista = usosPorMaterial.get(d.materialId) ?? [];
      lista.push({ cantidad: d.cantidad, inicio: inicioUso, fin: finUso });
      usosPorMaterial.set(d.materialId, lista);
      const p = prestados.get(d.materialId) ?? { unidades: 0, prestamos: 0 };
      p.unidades += d.cantidad;
      p.prestamos++;
      prestados.set(d.materialId, p);
    }
  }

  const nombres = new Map(materiales.map((m) => [m.id, m.nombre]));
  // Materiales ya inactivos que se prestaron en el período
  const faltantes = Array.from(prestados.keys()).filter((id) => !nombres.has(id));
  if (faltantes.length > 0) {
    const extra = await prisma.material.findMany({ where: { id: { in: faltantes } }, select: { id: true, nombre: true } });
    for (const m of extra) nombres.set(m.id, m.nombre);
  }

  const materialesPrestados: MaterialPrestado[] = Array.from(prestados.entries())
    .map(([id, p]) => ({ id, nombre: nombres.get(id) ?? `Material #${id}`, ...p }))
    .sort((a, b) => b.unidades - a.unidades || a.nombre.localeCompare(b.nombre, "es"));

  const utilizacion: UtilizacionMaterial[] = materiales
    .map((m) => {
      const unidades = m.estado === "DISPONIBLE" ? Math.max(0, m.cantidadTotal - m.cantidadMantenimiento) : 0;
      return {
        id: m.id,
        nombre: m.nombre,
        categoria: m.categoria,
        unidadesUtilizables: unidades,
        porcentaje: porcentajeUtilizacion(usosPorMaterial.get(m.id) ?? [], unidades, f.desde, f.hasta),
        rechazosPorStock: rechazosPorStock.get(m.id) ?? 0,
      };
    })
    .sort(
      (a, b) =>
        b.rechazosPorStock - a.rechazosPorStock ||
        (b.porcentaje ?? -1) - (a.porcentaje ?? -1) ||
        a.nombre.localeCompare(b.nombre, "es")
    );

  const resueltas = aprobadas + rechazadas;

  return {
    granularidad,
    secciones,
    indicadores: {
      recibidas: solicitudes.length,
      aprobadas,
      resueltas,
      tasaAprobacion: porcentaje(aprobadas, resueltas),
      devoluciones: devueltas.length,
      devolucionesATiempo,
      tasaATiempo: porcentaje(devolucionesATiempo, devueltas.length),
      unidadesDanadas,
      unidadesPerdidas,
    },
    serie: Array.from(serie.values()),
    resumenSecciones: Array.from(resumen.values()),
    materialesPrestados,
    utilizacion,
    motivosRechazo: Array.from(motivos.entries())
      .map(([motivo, cantidad]) => ({ motivo, etiqueta: etiquetaMotivoRechazo(motivo), cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad),
    danos,
  };
}

// ── Historial de préstamos del período ──────────────────────────────────────

export interface FilaHistorial {
  id: number;
  seccion: string;
  responsable: string;
  actividad: string | null;
  fechaSolicitud: Date;
  fechaRetiro: Date;
  fechaDevolucionEsperada: Date;
  fechaDevolucionReal: Date | null;
  estado: string;
  motivoRechazo: string | null;
  materiales: string;
}

export const HISTORIAL_POR_PAGINA = 15;

/** Historial paginado; con `todos: true` devuelve todas las filas (para CSV). */
export async function obtenerHistorial(
  f: FiltrosReporte,
  opciones: { todos?: boolean } = {}
): Promise<{ filas: FilaHistorial[]; total: number; pagina: number; totalPaginas: number }> {
  const { inicio, fin } = rangoInstantes(f);
  const where = {
    fechaSolicitud: { gte: inicio, lt: fin },
    ...(f.seccion ? { usuario: { seccion: f.seccion } } : {}),
  };

  const total = await prisma.solicitudPrestamo.count({ where });
  const totalPaginas = Math.max(1, Math.ceil(total / HISTORIAL_POR_PAGINA));
  const pagina = Math.min(f.pagina, totalPaginas);

  const solicitudes = await prisma.solicitudPrestamo.findMany({
    where,
    orderBy: { fechaSolicitud: "desc" },
    ...(opciones.todos ? {} : { skip: (pagina - 1) * HISTORIAL_POR_PAGINA, take: HISTORIAL_POR_PAGINA }),
    select: {
      id: true,
      responsable: true,
      actividad: true,
      fechaSolicitud: true,
      fechaRetiro: true,
      fechaDevolucionEsperada: true,
      fechaDevolucionReal: true,
      estado: true,
      motivoRechazo: true,
      usuario: { select: { seccion: true, nombre: true } },
      detalles: { select: { cantidad: true, material: { select: { nombre: true } } } },
    },
  });

  return {
    filas: solicitudes.map((s) => ({
      id: s.id,
      seccion: s.usuario.seccion ? etiquetaSeccion(s.usuario.seccion) : s.usuario.nombre,
      responsable: s.responsable,
      actividad: s.actividad,
      fechaSolicitud: s.fechaSolicitud,
      fechaRetiro: s.fechaRetiro,
      fechaDevolucionEsperada: s.fechaDevolucionEsperada,
      fechaDevolucionReal: s.fechaDevolucionReal,
      estado: s.estado,
      motivoRechazo: s.motivoRechazo,
      materiales: s.detalles.map((d) => `${d.material.nombre} ×${d.cantidad}`).join(", "),
    })),
    total,
    pagina,
    totalPaginas,
  };
}
