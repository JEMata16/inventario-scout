import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import bcrypt from "bcryptjs";

const adapter = new PrismaMssql(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // Limpiar datos previos (opcional)
  await prisma.detallePrestamo.deleteMany({});
  await prisma.solicitudPrestamo.deleteMany({});
  await prisma.material.deleteMany({});
  await prisma.usuario.deleteMany({});

  // Crear usuario admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.usuario.create({
    data: {
      email: "admin@scoutgroup.com",
      nombre: "Administrador",
      apellido: "Scout",
      password: adminPassword,
      rol: "ADMIN",
      estado: true,
    },
  });

  // Crear usuario de prueba
  const userPassword = await bcrypt.hash("user123", 10);
  await prisma.usuario.create({
    data: {
      email: "usuario@scoutgroup.com",
      nombre: "Juan",
      apellido: "Scout",
      password: userPassword,
      rol: "USUARIO",
      estado: true,
    },
  });

  // Crear materiales de prueba
  const materiales = await prisma.material.createMany({
    data: [
      {
        nombre: "Tienda de Campaña Grande",
        descripcion: "Tienda para 8-10 personas",
        cantidad: 5,
        categoria: "Campamento",
        estado: "DISPONIBLE",
        creadoPor: admin.id,
      },
      {
        nombre: "Tienda de Campaña Mediana",
        descripcion: "Tienda para 4-6 personas",
        cantidad: 10,
        categoria: "Campamento",
        estado: "DISPONIBLE",
        creadoPor: admin.id,
      },
      {
        nombre: "Cuerda (50m)",
        descripcion: "Cuerda de nylon resistente",
        cantidad: 20,
        categoria: "Herramientas",
        estado: "DISPONIBLE",
        creadoPor: admin.id,
      },
      {
        nombre: "Martillo",
        descripcion: "Martillo para carpintería",
        cantidad: 15,
        categoria: "Herramientas",
        estado: "DISPONIBLE",
        creadoPor: admin.id,
      },
      {
        nombre: "Uniforme Scout",
        descripcion: "Uniforme completo Scout",
        cantidad: 30,
        categoria: "Vestuario",
        estado: "DISPONIBLE",
        creadoPor: admin.id,
      },
      {
        nombre: "Insignia de Progresión",
        descripcion: "Insignia de progresión Scout",
        cantidad: 100,
        categoria: "Insignias",
        estado: "DISPONIBLE",
        creadoPor: admin.id,
      },
    ],
  });

  console.log("✅ Base de datos inicializada correctamente");
  console.log(`✅ Usuario Admin creado: admin@scoutgroup.com (contraseña: admin123)`);
  console.log(`✅ Usuario Test creado: usuario@scoutgroup.com (contraseña: user123)`);
  console.log(`✅ ${materiales.count} materiales creados`);
}

main()
  .catch((e) => {
    console.error("Error al inicializar la base de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
