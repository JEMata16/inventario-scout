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

# Pruebas (funciones puras de reportes)
npm test
```

## Credenciales de Prueba

- Admin: `admin@scoutgroup.com` / `admin123`
- Secciones: `manada@`, `tropa@`, `wak@`, `comunidad@scoutgroup.com` / `manada123`, `tropa123`, `wak123`, `comunidad123`

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

## Reportes y Análisis

Sección de análisis del administrador (`/admin/graficos`). Arriba hay una franja **«Hoy»** con lo que requiere atención (pendientes y conflictos, por entregar, devoluciones vencidas, retiros próximos, unidades en mantenimiento), que enlaza al panel de préstamos ya filtrado. Debajo, indicadores y gráficos que responden a los filtros de **período** y **sección** (guardados en la URL):

| Gráfico | Pregunta que responde |
|---|---|
| **Solicitudes en el tiempo, apiladas por sección**. Por día si el período es de hasta 1 mes, por semana hasta 6 meses y por mes si es más largo; los períodos sin solicitudes aparecen en cero. | ¿Cuándo hay más carga? ¿Qué sección pide más? |
| **Resumen por sección** (tabla): solicitudes, aprobadas, rechazadas, canceladas, % a tiempo, dañadas y perdidas | ¿Qué sección necesita un llamado de atención? |
| **Materiales más prestados, en unidades**. Solo cuenta préstamos aprobados, entregados o devueltos. | ¿Qué es lo más usado? |
| **Utilización y escasez por material**: % del tiempo que estuvo reservado y cuántas veces se rechazó por *Sin stock* o *Conflicto* | ¿Qué conviene **comprar** y qué está **ocioso**? |
| **Motivos de rechazo** (barras) | ¿Por qué se rechaza? |
| **Daños y pérdidas** (tabla por material y sección) | ¿Qué se está dañando o perdiendo, y con quién? |
| **Historial de préstamos del período**, con paginación real en el servidor | El detalle que respalda todo lo anterior |

Cada métrica usa la fecha que le corresponde: las solicitudes cuentan por **fecha de solicitud**; el uso de materiales, por el **período de uso** (retiro → devolución) que se traslapa con el filtro; las devoluciones, daños y pérdidas, por **fecha de devolución**.

**Exportar:** *Exportar CSV* descarga el historial, el resumen por sección, la utilización por material o los daños y pérdidas, con los mismos filtros que la pantalla (separador `;` y UTF-8, para Excel en español). *Imprimir / PDF* genera un informe en hoja carta con el navegador.

Al rechazar una solicitud se elige un **motivo predefinido** (sin stock, conflicto con otra sección, material no apto, en mantenimiento, solicitud incompleta, devoluciones pendientes u otro) y un detalle opcional.

## Próximas Etapas

Implementar Notificaciones (correo con SendGrid y recordatorios con node-cron) y la gestión de usuarios desde la aplicación.
