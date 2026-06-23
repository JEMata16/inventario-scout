# Scout Group #3 - Sistema de Inventario

Sistema de gestión de inventarios para el Grupo de Guías y Scouts #3 de la Sabana.

## Configuración Rápida

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar .env.local con tus credenciales SQL Server
# DATABASE_URL="sqlserver://localhost,1433;database=tcu_inventario_scout;..."

# 3. Generar Prisma Client
npm run db:generate

# 4. Ejecutar migraciones
npm run db:push

# 5. Seed de datos
npm run db:seed

# 6. Iniciar desarrollo
npm run dev
```

## Credenciales de Prueba

- Admin: `admin@scoutgroup.com` / `admin123`
- Usuario: `usuario@scoutgroup.com` / `user123`

## Tecnologías

- Next.js 16 + TypeScript + Tailwind CSS
- NextAuth.js para autenticación
- SQL Server + Prisma ORM
- Zod para validación
- React Hook Form
- Recharts para gráficos

## Estructura

- `/app` - Páginas y rutas
- `/components` - Componentes React
- `/lib` - Librerías y configuración
- `/types` - Definiciones TypeScript
- `/prisma` - Schema de base de datos

## Próximas Etapas

Implementar módulos de Materiales, Préstamos, Gráficos y Notificaciones.
