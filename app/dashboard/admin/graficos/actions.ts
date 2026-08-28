"use server";

import { prisma } from "@/lib/db";

// Helper function to subtract days from a date
const subDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

export async function fetchKPIData() {
  try {
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Total available materials
    const materialesDisponibles = await prisma.material.count({
      where: { estado: "DISPONIBLE" },
    });

    // Active loans
    const prestamosActivos = await prisma.solicitudPrestamo.count({
      where: { estado: "APROBADA" },
    });

    // Approval rate (last 30 days)
    const solicitudesLast30Days = await prisma.solicitudPrestamo.count({
      where: { fechaSolicitud: { gte: thirtyDaysAgo } },
    });

    const aprobadas = await prisma.solicitudPrestamo.count({
      where: {
        estado: "APROBADA",
        fechaSolicitud: { gte: thirtyDaysAgo },
      },
    });

    const tasaAprobacion =
      solicitudesLast30Days > 0
        ? Math.round((aprobadas / solicitudesLast30Days) * 100)
        : 0;

    // On-time returns
    const devueltosaTiempo = await prisma.solicitudPrestamo.count({
      where: {
        estado: "DEVUELTO",
        fechaDevolucionReal: { gte: thirtyDaysAgo },
        fechaDevolucionEsperada: { gte: thirtyDaysAgo },
      },
    });

    const devoluciones = await prisma.solicitudPrestamo.count({
      where: {
        estado: "DEVUELTO",
        fechaDevolucionReal: { gte: thirtyDaysAgo },
      },
    });

    const tasaDevoluciones =
      devoluciones > 0
        ? Math.round((devueltosaTiempo / devoluciones) * 100)
        : 100;

    // Calculate trends
    const sixtyDaysAgo = subDays(new Date(), 60);
    const materialesDisponiblesPrevious = await prisma.material.count({
      where: {
        estado: "DISPONIBLE",
        createdAt: { lt: thirtyDaysAgo, gte: sixtyDaysAgo },
      },
    });

    const trendMateriales =
      materialesDisponiblesPrevious > 0
        ? Math.round(
            ((materialesDisponibles - materialesDisponiblesPrevious) /
              materialesDisponiblesPrevious) *
              100
          )
        : 0;

    return {
      materialesDisponibles,
      prestamosActivos,
      tasaAprobacion,
      tasaDevoluciones,
      trends: {
        materiales: trendMateriales,
      },
    };
  } catch (error) {
    console.error("Error fetching KPI data:", error);
    throw error;
  }
}

export async function fetchTrendData(days: number = 30) {
  try {
    const startDate = subDays(new Date(), days);

    const data = await prisma.$queryRaw<
      Array<{ fecha: string; solicitudes: number }>
    >`
      SELECT
        CAST(CAST(fechaSolicitud AS DATE) AS VARCHAR) as fecha,
        COUNT(*) as solicitudes
      FROM SolicitudPrestamo
      WHERE fechaSolicitud >= ${startDate}
      GROUP BY CAST(fechaSolicitud AS DATE)
      ORDER BY CAST(fechaSolicitud AS DATE) ASC
    `;

    return (data || []).map((row) => ({
      date: row.fecha,
      solicitudes: Number(row.solicitudes),
    }));
  } catch (error) {
    console.error("Error fetching trend data:", error);
    throw error;
  }
}

export async function fetchTopMaterials(limit: number = 5) {
  try {
    const data = await prisma.$queryRaw<
      Array<{ materialId: number; nombre: string; count: number }>
    >`
      SELECT TOP ${limit}
        m.id as materialId,
        m.nombre,
        COUNT(*) as count
      FROM DetallePrestamo dp
      JOIN Material m ON dp.materialId = m.id
      GROUP BY m.id, m.nombre
      ORDER BY COUNT(*) DESC
    `;

    return (data || []).map((row) => ({
      id: Number(row.materialId),
      nombre: row.nombre,
      count: Number(row.count),
    }));
  } catch (error) {
    console.error("Error fetching top materials:", error);
    throw error;
  }
}

export async function fetchRejectionReasons(limit: number = 5) {
  try {
    const data = await prisma.$queryRaw<
      Array<{ razon: string; count: number }>
    >`
      SELECT TOP ${limit}
        COALESCE(razonRechazo, 'No especificado') as razon,
        COUNT(*) as count
      FROM SolicitudPrestamo
      WHERE estado = 'RECHAZADA' AND razonRechazo IS NOT NULL
      GROUP BY razonRechazo
      ORDER BY COUNT(*) DESC
    `;

    return (data || []).map((row) => ({
      razon: row.razon,
      count: Number(row.count),
    }));
  } catch (error) {
    console.error("Error fetching rejection reasons:", error);
    throw error;
  }
}

export async function fetchLoanStatusData() {
  try {
    const estados = ["PENDIENTE", "APROBADA", "DEVUELTO", "RECHAZADA"];

    const data = await Promise.all(
      estados.map(async (estado) => ({
        estado,
        count: await prisma.solicitudPrestamo.count({
          where: { estado },
        }),
      }))
    );

    return data.map((item) => ({
      nombre: item.estado,
      value: item.count,
    }));
  } catch (error) {
    console.error("Error fetching loan status data:", error);
    throw error;
  }
}

export async function fetchRecentLoans(limit: number = 10, offset: number = 0) {
  try {
    const loans = await prisma.solicitudPrestamo.findMany({
      skip: offset,
      take: limit,
      orderBy: { fechaSolicitud: "desc" },
      include: {
        usuario: {
          select: { nombre, apellido, email },
        },
        detalles: {
          include: {
            material: {
              select: { nombre },
            },
          },
        },
      },
    });

    const total = await prisma.solicitudPrestamo.count();

    return {
      loans: loans.map((loan) => ({
        id: loan.id,
        usuarioNombre: `${loan.usuario.nombre} ${loan.usuario.apellido || ""}`.trim(),
        usuarioEmail: loan.usuario.email,
        materiales: loan.detalles.map((d) => d.material.nombre).join(", "),
        fechaSolicitud: loan.fechaSolicitud,
        estado: loan.estado,
        razonRechazo: loan.razonRechazo,
      })),
      total,
    };
  } catch (error) {
    console.error("Error fetching recent loans:", error);
    throw error;
  }
}
