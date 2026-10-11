// Cálculo de disponibilidad de materiales por rango de fechas.
//
// disponible = cantidadTotal - cantidadMantenimiento - pico de unidades reservadas
// en préstamos APROBADOS o ENTREGADOS que se traslapan con el rango.
//
// Se usa el *pico* diario (no la suma) para que dos préstamos en días distintos
// dentro del rango no se cuenten como simultáneos. Un préstamo ENTREGADO cuya
// fecha de devolución ya pasó se considera fuera hasta que se registre la
// devolución.

import { Prisma, type PrismaClient } from "@prisma/client";
import { hoyCR, sumarDias, diferenciaDias } from "./fechas";

type Db = PrismaClient | Prisma.TransactionClient;

export const MAX_DIAS_PRESTAMO = 60;

export interface Reserva {
  cantidad: number;
  inicio: Date;
  /** null = sin fin conocido (entregado y vencido sin devolver) */
  fin: Date | null;
}

/** Máximo de unidades reservadas simultáneamente en algún día de [desde, hasta]. */
export function picoReservado(reservas: Reserva[], desde: Date, hasta: Date): number {
  const eventos: Array<[number, number]> = [];
  for (const r of reservas) {
    const inicio = Math.max(r.inicio.getTime(), desde.getTime());
    const fin = r.fin === null ? hasta.getTime() : Math.min(r.fin.getTime(), hasta.getTime());
    if (inicio > fin) continue;
    eventos.push([inicio, r.cantidad]);
    // La reserva libera las unidades el día siguiente a su último día
    eventos.push([sumarDias(new Date(fin), 1).getTime(), -r.cantidad]);
  }
  // En el mismo instante, liberar antes de reservar
  eventos.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  let actual = 0;
  let pico = 0;
  for (const [, delta] of eventos) {
    actual += delta;
    if (actual > pico) pico = actual;
  }
  return pico;
}

export interface SolicitudCompetidora {
  solicitudId: number;
  seccion: string;
  responsable: string;
  cantidad: number;
  fechaRetiro: Date;
  fechaDevolucionEsperada: Date;
}

export interface Disponibilidad {
  materialId: number;
  nombre: string;
  estado: string;
  cantidadTotal: number;
  cantidadMantenimiento: number;
  /** Pico reservado por préstamos aprobados/entregados en el rango */
  reservado: number;
  /** Unidades que se pueden aprobar para el rango */
  disponible: number;
  /** Unidades que quedarían si se aprobaran también las solicitudes pendientes que se traslapan */
  disponibleConPendientes: number;
  /** Solicitudes pendientes de otras secciones que piden el mismo material en fechas traslapadas */
  pendientes: SolicitudCompetidora[];
}

interface Opciones {
  /** Solicitud a ignorar en el cálculo (la que se está evaluando) */
  excluirSolicitudId?: number;
  /** Incluir análisis de solicitudes pendientes (advertencias de conflicto) */
  conPendientes?: boolean;
}

export async function calcularDisponibilidad(
  db: Db,
  materialIds: number[],
  desde: Date,
  hasta: Date,
  opciones: Opciones = {}
): Promise<Map<number, Disponibilidad>> {
  const ids = Array.from(new Set(materialIds));
  const resultado = new Map<number, Disponibilidad>();
  if (ids.length === 0) return resultado;

  const hoy = hoyCR();
  const estados = opciones.conPendientes
    ? ["APROBADA", "ENTREGADA", "PENDIENTE"]
    : ["APROBADA", "ENTREGADA"];

  const [materiales, detalles] = await Promise.all([
    db.material.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true, estado: true, cantidadTotal: true, cantidadMantenimiento: true },
    }),
    db.detallePrestamo.findMany({
      where: {
        materialId: { in: ids },
        solicitud: {
          estado: { in: estados },
          ...(opciones.excluirSolicitudId && { id: { not: opciones.excluirSolicitudId } }),
          fechaRetiro: { lte: hasta },
          OR: [
            { fechaDevolucionEsperada: { gte: desde } },
            { estado: "ENTREGADA", fechaDevolucionEsperada: { lt: hoy } },
          ],
        },
      },
      select: {
        materialId: true,
        cantidad: true,
        solicitud: {
          select: {
            id: true,
            estado: true,
            responsable: true,
            fechaRetiro: true,
            fechaDevolucionEsperada: true,
            usuario: { select: { nombre: true } },
          },
        },
      },
    }),
  ]);

  for (const m of materiales) {
    const propios = detalles.filter((d) => d.materialId === m.id);
    const confirmadas: Reserva[] = [];
    const conPendientes: Reserva[] = [];
    const pendientes: SolicitudCompetidora[] = [];

    for (const d of propios) {
      const s = d.solicitud;
      const vencida = s.estado === "ENTREGADA" && s.fechaDevolucionEsperada < hoy;
      const reserva: Reserva = { cantidad: d.cantidad, inicio: s.fechaRetiro, fin: vencida ? null : s.fechaDevolucionEsperada };
      conPendientes.push(reserva);
      if (s.estado === "PENDIENTE") {
        pendientes.push({
          solicitudId: s.id,
          seccion: s.usuario.nombre,
          responsable: s.responsable,
          cantidad: d.cantidad,
          fechaRetiro: s.fechaRetiro,
          fechaDevolucionEsperada: s.fechaDevolucionEsperada,
        });
      } else {
        confirmadas.push(reserva);
      }
    }

    const utilizable = m.estado === "DISPONIBLE" ? Math.max(0, m.cantidadTotal - m.cantidadMantenimiento) : 0;
    const reservado = picoReservado(confirmadas, desde, hasta);
    resultado.set(m.id, {
      materialId: m.id,
      nombre: m.nombre,
      estado: m.estado,
      cantidadTotal: m.cantidadTotal,
      cantidadMantenimiento: m.cantidadMantenimiento,
      reservado,
      disponible: Math.max(0, utilizable - reservado),
      disponibleConPendientes: Math.max(0, utilizable - picoReservado(conPendientes, desde, hasta)),
      pendientes,
    });
  }

  return resultado;
}

/**
 * Pico de unidades comprometidas desde hoy en adelante (préstamos aprobados o
 * entregados). Se usa para no permitir que el total de un material baje por
 * debajo de lo ya prometido a las secciones.
 */
export async function comprometidoDesdeHoy(db: Db, materialId: number): Promise<number> {
  const hoy = hoyCR();
  const ultima = await db.solicitudPrestamo.aggregate({
    where: { estado: { in: ["APROBADA", "ENTREGADA"] }, detalles: { some: { materialId } } },
    _max: { fechaDevolucionEsperada: true },
  });
  const hasta = ultima._max.fechaDevolucionEsperada;
  if (!hasta) return 0;
  const fin = hasta > hoy ? hasta : hoy;
  const disp = await calcularDisponibilidad(db, [materialId], hoy, fin);
  return disp.get(materialId)?.reservado ?? 0;
}

/**
 * Bloquea las filas de los materiales hasta el final de la transacción para
 * que dos aprobaciones simultáneas sobre los mismos materiales no puedan
 * comprometer el mismo stock. Los ids se ordenan para evitar interbloqueos.
 */
export async function bloquearMateriales(tx: Prisma.TransactionClient, materialIds: number[]) {
  const ids = Array.from(new Set(materialIds)).sort((a, b) => a - b);
  if (ids.length === 0) return;
  await tx.$queryRaw`SELECT id FROM Material WITH (UPDLOCK, HOLDLOCK) WHERE id IN (${Prisma.join(ids)})`;
}

/** Valida un rango de préstamo. Devuelve un mensaje de error o null. */
export function validarRangoPrestamo(desde: Date, hasta: Date, { permitirPasado = false } = {}): string | null {
  if (hasta < desde) return "La fecha de devolución no puede ser anterior a la fecha de retiro";
  if (!permitirPasado && desde < hoyCR()) return "La fecha de retiro no puede ser en el pasado";
  if (diferenciaDias(desde, hasta) + 1 > MAX_DIAS_PRESTAMO) {
    return `Un préstamo no puede durar más de ${MAX_DIAS_PRESTAMO} días`;
  }
  return null;
}

export type TipoConflicto = "SIN_STOCK" | "COMPITE";

/**
 * Clasifica solicitudes pendientes: SIN_STOCK si ya no alcanza con lo aprobado,
 * COMPITE si alcanza pero no para todas las pendientes que se traslapan.
 */
export async function clasificarConflictos(
  db: Db,
  pendientes: Array<{
    id: number;
    fechaRetiro: Date;
    fechaDevolucionEsperada: Date;
    detalles: Array<{ materialId: number; cantidad: number }>;
  }>
): Promise<Map<number, TipoConflicto>> {
  const resultado = new Map<number, TipoConflicto>();
  await Promise.all(
    pendientes.map(async (s) => {
      const disp = await calcularDisponibilidad(
        db,
        s.detalles.map((d) => d.materialId),
        s.fechaRetiro,
        s.fechaDevolucionEsperada,
        { excluirSolicitudId: s.id, conPendientes: true }
      );
      let tipo: TipoConflicto | null = null;
      for (const d of s.detalles) {
        const m = disp.get(d.materialId);
        if (!m) continue;
        if (d.cantidad > m.disponible) { tipo = "SIN_STOCK"; break; }
        if (d.cantidad > m.disponibleConPendientes) tipo = "COMPITE";
      }
      if (tipo) resultado.set(s.id, tipo);
    })
  );
  return resultado;
}
