import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import bcrypt from "bcryptjs";

const adapter = new PrismaMssql(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter } as any);

// Fechas de calendario relativas a hoy (Costa Rica), a medianoche UTC
const hoyISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica" }).format(new Date());
const hoy = new Date(`${hoyISO}T00:00:00Z`);
const dia = (n: number) => new Date(hoy.getTime() + n * 86_400_000);
const instante = (n: number, hora = 15) => new Date(dia(n).getTime() + hora * 3_600_000);

const SECCIONES = [
  { seccion: "MANADA", nombre: "Manada", email: "manada@scoutgroup.com", password: "manada123" },
  { seccion: "TROPA", nombre: "Tropa", email: "tropa@scoutgroup.com", password: "tropa123" },
  { seccion: "WAK", nombre: "Wak", email: "wak@scoutgroup.com", password: "wak123" },
  { seccion: "COMUNIDAD", nombre: "Comunidad", email: "comunidad@scoutgroup.com", password: "comunidad123" },
] as const;

async function main() {
  // Limpiar datos previos
  await prisma.detallePrestamo.deleteMany({});
  await prisma.solicitudPrestamo.deleteMany({});
  await prisma.material.deleteMany({});
  await prisma.usuario.deleteMany({});

  // ── Usuarios ──────────────────────────────────────────────────────────────

  const admin = await prisma.usuario.create({
    data: {
      email: "admin@scoutgroup.com",
      nombre: "Administración",
      apellido: "Grupo 3",
      password: await bcrypt.hash("admin123", 10),
      rol: "ADMIN",
      estado: true,
    },
  });

  const secciones: Record<string, number> = {};
  for (const s of SECCIONES) {
    const u = await prisma.usuario.create({
      data: {
        email: s.email,
        nombre: s.nombre,
        password: await bcrypt.hash(s.password, 10),
        rol: "USUARIO",
        seccion: s.seccion,
        estado: true,
      },
    });
    secciones[s.seccion] = u.id;
  }

  // ── Materiales ────────────────────────────────────────────────────────────

  const materialesData = [
    { nombre: "Tienda de campaña grande", descripcion: "Tienda para 8 a 10 personas", cantidadTotal: 5, categoria: "Campamento" },
    { nombre: "Tienda de campaña mediana", descripcion: "Tienda para 4 a 6 personas", cantidadTotal: 10, categoria: "Campamento" },
    { nombre: "Lona 4x6 m", descripcion: "Lona impermeable para toldos", cantidadTotal: 8, categoria: "Campamento" },
    { nombre: "Cuerda de nylon (50 m)", descripcion: "Cuerda resistente para pionerismo", cantidadTotal: 20, cantidadMantenimiento: 1, categoria: "Pionerismo" },
    { nombre: "Hacha", descripcion: "Hacha de mano con funda", cantidadTotal: 4, cantidadMantenimiento: 1, categoria: "Herramientas" },
    { nombre: "Olla grande (20 L)", descripcion: "Olla de aluminio con tapa", cantidadTotal: 6, categoria: "Cocina" },
    { nombre: "Cocina de gas de dos discos", descripcion: "Incluye manguera y regulador", cantidadTotal: 3, cantidadMantenimiento: 1, categoria: "Cocina" },
    { nombre: "Linterna recargable", descripcion: "Linterna LED con cargador USB", cantidadTotal: 12, categoria: "Equipo" },
    { nombre: "Botiquín de primeros auxilios", descripcion: "Botiquín completo para salidas", cantidadTotal: 3, categoria: "Seguridad" },
    { nombre: "Banderín de patrulla", descripcion: "Asta y banderín", cantidadTotal: 8, categoria: "Ceremonial", estado: "EN_MANTENIMIENTO" },
  ];

  const materiales: Record<string, number> = {};
  for (const m of materialesData) {
    const creado = await prisma.material.create({
      data: { estado: "DISPONIBLE", cantidadMantenimiento: 0, ...m, creadoPor: admin.id },
    });
    materiales[m.nombre] = creado.id;
  }
  const mat = (nombre: string) => materiales[nombre];

  // ── Préstamos de ejemplo ──────────────────────────────────────────────────

  // Tropa: campamento aprobado para dentro de una semana (reserva 3 de 5 tiendas grandes)
  await prisma.solicitudPrestamo.create({
    data: {
      usuarioId: secciones.TROPA,
      estado: "APROBADA",
      responsable: "Andrés Solano",
      actividad: "Campamento de tropa en La Cangreja",
      fechaSolicitud: instante(-5),
      fechaRetiro: dia(7),
      fechaDevolucionEsperada: dia(9),
      fechaAprobacion: instante(-4),
      aceptadoPor: admin.id,
      detalles: {
        create: [
          { materialId: mat("Tienda de campaña grande"), cantidad: 3 },
          { materialId: mat("Cuerda de nylon (50 m)"), cantidad: 6 },
          { materialId: mat("Olla grande (20 L)"), cantidad: 2 },
        ],
      },
    },
  });

  // Wak y Comunidad: piden las 2 tiendas grandes restantes en fechas traslapadas -> conflicto
  await prisma.solicitudPrestamo.create({
    data: {
      usuarioId: secciones.WAK,
      estado: "PENDIENTE",
      responsable: "Daniela Rojas",
      actividad: "Acantonamiento de Wak",
      fechaSolicitud: instante(-2),
      fechaRetiro: dia(8),
      fechaDevolucionEsperada: dia(10),
      detalles: {
        create: [
          { materialId: mat("Tienda de campaña grande"), cantidad: 2 },
          { materialId: mat("Linterna recargable"), cantidad: 4 },
        ],
      },
    },
  });

  await prisma.solicitudPrestamo.create({
    data: {
      usuarioId: secciones.COMUNIDAD,
      estado: "PENDIENTE",
      responsable: "José Pablo Vargas",
      actividad: "Caminata y pernocta en Barva",
      fechaSolicitud: instante(-1),
      fechaRetiro: dia(7),
      fechaDevolucionEsperada: dia(8),
      detalles: {
        create: [
          { materialId: mat("Tienda de campaña grande"), cantidad: 2 },
          { materialId: mat("Botiquín de primeros auxilios"), cantidad: 1 },
        ],
      },
    },
  });

  // Manada: material entregado con devolución vencida
  await prisma.solicitudPrestamo.create({
    data: {
      usuarioId: secciones.MANADA,
      estado: "ENTREGADA",
      responsable: "Gabriela Mora",
      actividad: "Noche de cuentos en la sede",
      fechaSolicitud: instante(-10),
      fechaRetiro: dia(-3),
      fechaDevolucionEsperada: dia(-1),
      fechaAprobacion: instante(-9),
      fechaEntrega: instante(-3),
      aceptadoPor: admin.id,
      entregadoPor: admin.id,
      detalles: {
        create: [{ materialId: mat("Linterna recargable"), cantidad: 6 }],
      },
    },
  });

  // Tropa: préstamo en curso (entregado, se devuelve en dos días)
  await prisma.solicitudPrestamo.create({
    data: {
      usuarioId: secciones.TROPA,
      estado: "ENTREGADA",
      responsable: "Andrés Solano",
      actividad: "Taller de cocina scout",
      fechaSolicitud: instante(-6),
      fechaRetiro: dia(-1),
      fechaDevolucionEsperada: dia(2),
      fechaAprobacion: instante(-5),
      fechaEntrega: instante(-1),
      aceptadoPor: admin.id,
      entregadoPor: admin.id,
      detalles: {
        create: [
          { materialId: mat("Cocina de gas de dos discos"), cantidad: 2 },
          { materialId: mat("Olla grande (20 L)"), cantidad: 2 },
        ],
      },
    },
  });

  // Comunidad: devuelta con un hacha dañada (por eso el hacha tiene 1 en mantenimiento)
  await prisma.solicitudPrestamo.create({
    data: {
      usuarioId: secciones.COMUNIDAD,
      estado: "DEVUELTA",
      responsable: "José Pablo Vargas",
      actividad: "Proyecto de servicio comunal",
      fechaSolicitud: instante(-25),
      fechaRetiro: dia(-20),
      fechaDevolucionEsperada: dia(-18),
      fechaAprobacion: instante(-24),
      fechaEntrega: instante(-20),
      fechaDevolucionReal: instante(-18),
      aceptadoPor: admin.id,
      entregadoPor: admin.id,
      recibidoPor: admin.id,
      observacionesDevolucion: "Devuelto completo salvo el hacha.",
      detalles: {
        create: [
          { materialId: mat("Lona 4x6 m"), cantidad: 2 },
          { materialId: mat("Hacha"), cantidad: 2, cantidadDanada: 1, observaciones: "Mango quebrado" },
        ],
      },
    },
  });

  // Manada: rechazada
  await prisma.solicitudPrestamo.create({
    data: {
      usuarioId: secciones.MANADA,
      estado: "RECHAZADA",
      responsable: "Gabriela Mora",
      actividad: "Juego de ciudad",
      fechaSolicitud: instante(-12),
      fechaRetiro: dia(-8),
      fechaDevolucionEsperada: dia(-8),
      fechaRechazo: instante(-11),
      rechazadoPor: admin.id,
      motivoRechazo: "NO_APTO",
      razonRechazo: "Las hachas no se prestan a la Manada por seguridad",
      detalles: { create: [{ materialId: mat("Hacha"), cantidad: 1 }] },
    },
  });

  // Wak: cancelada por la sección
  await prisma.solicitudPrestamo.create({
    data: {
      usuarioId: secciones.WAK,
      estado: "CANCELADA",
      responsable: "Daniela Rojas",
      actividad: "Excursión suspendida por lluvia",
      fechaSolicitud: instante(-15),
      fechaRetiro: dia(-6),
      fechaDevolucionEsperada: dia(-5),
      fechaCancelacion: instante(-7),
      detalles: { create: [{ materialId: mat("Lona 4x6 m"), cantidad: 3 }] },
    },
  });

  // ── Historial de los últimos meses (para los reportes de Análisis) ─────────

  type Historico = {
    seccion: keyof typeof secciones;
    responsable: string;
    actividad: string;
    haceDias: number; // días desde la fecha de retiro hasta hoy
    duracion: number;
    materiales: Array<[string, number, number?, number?]>; // nombre, cantidad, dañadas, perdidas
    resultado: "DEVUELTA" | "DEVUELTA_TARDE" | "RECHAZADA";
    motivoRechazo?: string;
    razonRechazo?: string;
  };

  const historicos: Historico[] = [
    { seccion: "TROPA", responsable: "Andrés Solano", actividad: "Campamento de patrulla", haceDias: 80, duracion: 3, materiales: [["Tienda de campaña mediana", 4], ["Olla grande (20 L)", 2]], resultado: "DEVUELTA" },
    { seccion: "MANADA", responsable: "Gabriela Mora", actividad: "Excursión a la Sabana", haceDias: 74, duracion: 1, materiales: [["Lona 4x6 m", 2], ["Botiquín de primeros auxilios", 1]], resultado: "DEVUELTA" },
    { seccion: "WAK", responsable: "Daniela Rojas", actividad: "Campamento de Wak", haceDias: 66, duracion: 3, materiales: [["Tienda de campaña grande", 3], ["Linterna recargable", 6, 0, 1]], resultado: "DEVUELTA_TARDE" },
    { seccion: "COMUNIDAD", responsable: "José Pablo Vargas", actividad: "Ascenso al Chirripó", haceDias: 66, duracion: 4, materiales: [["Tienda de campaña grande", 3]], resultado: "RECHAZADA", motivoRechazo: "SIN_STOCK", razonRechazo: "Las tiendas grandes ya estaban comprometidas" },
    { seccion: "TROPA", responsable: "Andrés Solano", actividad: "Taller de pionerismo", haceDias: 52, duracion: 2, materiales: [["Cuerda de nylon (50 m)", 10, 1], ["Hacha", 2]], resultado: "DEVUELTA" },
    { seccion: "MANADA", responsable: "Gabriela Mora", actividad: "Fogata de manada", haceDias: 45, duracion: 1, materiales: [["Linterna recargable", 8]], resultado: "DEVUELTA" },
    { seccion: "WAK", responsable: "Daniela Rojas", actividad: "Caminata nocturna", haceDias: 38, duracion: 1, materiales: [["Linterna recargable", 6]], resultado: "RECHAZADA", motivoRechazo: "DEVOLUCIONES_PENDIENTES", razonRechazo: "Falta devolver una linterna del campamento anterior" },
    { seccion: "COMUNIDAD", responsable: "José Pablo Vargas", actividad: "Campamento de servicio", haceDias: 30, duracion: 3, materiales: [["Tienda de campaña mediana", 5], ["Cocina de gas de dos discos", 1, 1]], resultado: "DEVUELTA_TARDE" },
    { seccion: "TROPA", responsable: "Andrés Solano", actividad: "Acantonamiento", haceDias: 30, duracion: 2, materiales: [["Cocina de gas de dos discos", 3]], resultado: "RECHAZADA", motivoRechazo: "CONFLICTO", razonRechazo: "Comunidad ya tenía una cocina apartada esas fechas" },
    { seccion: "MANADA", responsable: "Gabriela Mora", actividad: "Día del niño", haceDias: 24, duracion: 1, materiales: [["Lona 4x6 m", 3]], resultado: "DEVUELTA" },
    { seccion: "WAK", responsable: "Daniela Rojas", actividad: "Taller de cocina", haceDias: 15, duracion: 2, materiales: [["Olla grande (20 L)", 3], ["Cocina de gas de dos discos", 1]], resultado: "DEVUELTA" },
  ];

  for (const h of historicos) {
    const retiro = -h.haceDias;
    const devolucion = retiro + h.duracion - 1;
    const solicitada = retiro - 10;
    const detalles = h.materiales.map(([nombre, cantidad, danadas = 0, perdidas = 0]) => ({
      materialId: mat(nombre),
      cantidad,
      cantidadDanada: danadas,
      cantidadFaltante: perdidas,
    }));

    if (h.resultado === "RECHAZADA") {
      await prisma.solicitudPrestamo.create({
        data: {
          usuarioId: secciones[h.seccion], estado: "RECHAZADA", responsable: h.responsable, actividad: h.actividad,
          fechaSolicitud: instante(solicitada), fechaRetiro: dia(retiro), fechaDevolucionEsperada: dia(devolucion),
          fechaRechazo: instante(solicitada + 1), rechazadoPor: admin.id,
          motivoRechazo: h.motivoRechazo, razonRechazo: h.razonRechazo,
          detalles: { create: detalles.map(({ materialId, cantidad }) => ({ materialId, cantidad })) },
        },
      });
      continue;
    }

    const tarde = h.resultado === "DEVUELTA_TARDE" ? 2 : 0;
    const danado = detalles.some((d) => d.cantidadDanada > 0 || d.cantidadFaltante > 0);
    await prisma.solicitudPrestamo.create({
      data: {
        usuarioId: secciones[h.seccion], estado: "DEVUELTA", responsable: h.responsable, actividad: h.actividad,
        fechaSolicitud: instante(solicitada), fechaRetiro: dia(retiro), fechaDevolucionEsperada: dia(devolucion),
        fechaAprobacion: instante(solicitada + 1), fechaEntrega: instante(retiro, 14),
        fechaDevolucionReal: instante(devolucion + tarde, 17),
        aceptadoPor: admin.id, entregadoPor: admin.id, recibidoPor: admin.id,
        observacionesDevolucion: danado ? "Se registraron unidades dañadas o faltantes." : null,
        detalles: { create: detalles },
      },
    });
  }

  console.log("✅ Base de datos inicializada correctamente");
  console.log("✅ Admin: admin@scoutgroup.com (contraseña: admin123)");
  for (const s of SECCIONES) console.log(`✅ ${s.nombre}: ${s.email} (contraseña: ${s.password})`);
  console.log(`✅ ${materialesData.length} materiales y ${8 + historicos.length} solicitudes de ejemplo creados`);
}

main()
  .catch((e) => {
    console.error("Error al inicializar la base de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
