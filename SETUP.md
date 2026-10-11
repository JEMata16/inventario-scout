# 🚀 Setup Guide - TCU Scout Inventory

This guide walks new contributors through setting up the project locally. The project uses **pnpm** by default (recommended), but npm also works.

## Prerequisites

Before starting, ensure you have:

- **Node.js** 18+ ([download](https://nodejs.org/)) — run `node --version` to check
- **SQL Server** running locally or remote access configured
- **Git** for cloning the repository

## Quick Start (pnpm - Recommended)

### 1. Clone & Install

```bash
git clone <repository-url>
cd tcu-scout-inventory

# Install pnpm globally (one-time only)
npm install -g pnpm

# Install project dependencies
pnpm install
```

### 2. Configure Environment

Create a `.env.local` file in the project root:

```env
# SQL Server Connection
DATABASE_URL="sqlserver://localhost,1433;database=tcu_inventario_scout;user=sa;password=YOUR_PASSWORD;encrypt=true;trustServerCertificate=true"

# NextAuth Secret (generate: `openssl rand -base64 32`)
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# SendGrid (optional, for email notifications)
SENDGRID_API_KEY=your-sendgrid-key-here
```

**Connection string notes:**
- Replace `YOUR_PASSWORD` with your SQL Server `sa` password
- Ensure the database `tcu_inventario_scout` exists
- Use `trustServerCertificate=true` for local dev environments

### 3. Create the Database (First Time Only)

The database must exist before Prisma can create tables. Choose your method:

**Option A: SQL Server Management Studio (GUI)**
1. Open SQL Server Management Studio
2. Connect to your SQL Server instance
3. Right-click **Databases** → **New Database**
4. Name: `tcu_inventario_scout`
5. Click **OK**

**Option B: SQL Query**
```sql
CREATE DATABASE tcu_inventario_scout;
```

**Option C: PowerShell/Command Line**
```bash
sqlcmd -S localhost -U sa -P YOUR_PASSWORD -Q "CREATE DATABASE tcu_inventario_scout;"
```

### 4. Setup Database Schema

```bash
# Generate Prisma Client
pnpm run db:generate

# Push schema to database (creates all tables)
pnpm run db:push

# Seed with test data
pnpm run db:seed
```

### 5. Start Development Server

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Using npm Instead

If you prefer npm (or don't have pnpm installed), replace all `pnpm` commands with `npm`:

```bash
# Install dependencies
npm install

# Run commands
npm run dev
npm run db:generate
npm run db:push
npm run db:seed
```

**Performance note:** npm may be slightly slower than pnpm, especially for dependency resolution.

## Available Commands

| Command | Purpose |
|---------|---------|
| `pnpm run dev` | Start development server (localhost:3000) |
| `pnpm run build` | Build for production |
| `pnpm run start` | Start production server |
| `pnpm run lint` | Run ESLint |
| `pnpm test` | Run unit tests (`node:test` via `tsx`, files `lib/**/*.test.ts`) |
| `pnpm run db:generate` | Regenerate Prisma Client after schema changes |
| `pnpm run db:push` | Push schema changes to database |
| `pnpm run db:seed` | Seed database with test data |
| `pnpm run db:studio` | Open Prisma Studio GUI (view/edit database) |

## Test Credentials

After seeding, use these credentials to log in. Each Scout section (sección) shares a single account:

| Account | Role | Email | Password |
|---------|------|-------|----------|
| Administración | `ADMIN` | `admin@scoutgroup.com` | `admin123` |
| Manada | `USUARIO` | `manada@scoutgroup.com` | `manada123` |
| Tropa | `USUARIO` | `tropa@scoutgroup.com` | `tropa123` |
| Wak | `USUARIO` | `wak@scoutgroup.com` | `wak123` |
| Comunidad | `USUARIO` | `comunidad@scoutgroup.com` | `comunidad123` |

The credentials hint on the login page is only shown in development (`NODE_ENV !== "production"`).

### Seed data

`db:seed` **deletes all existing data** and creates:

- The 5 accounts above.
- 10 materials (one with a unit in maintenance, one fully `EN_MANTENIMIENTO`).
- 8 current loan requests covering every state, with dates relative to today (plus 11 historical ones, see *Analytics* below):
  - **Tropa** — `APROBADA` camp in 7–9 days (reserves 3 of the 5 large tents).
  - **Wak** and **Comunidad** — `PENDIENTE`, both asking for the remaining 2 large tents on overlapping dates. This is the conflict scenario: approving one blocks the other.
  - **Manada** — `ENTREGADA` and overdue (shows as *Vencida*).
  - **Tropa** — `ENTREGADA`, currently out.
  - **Comunidad** — `DEVUELTA` with a damaged axe.
  - One `RECHAZADA` and one `CANCELADA`.

## How loans and availability work

- A loan request (`SolicitudPrestamo`) has a **pick-up date** (`fechaRetiro`) and a **return date** (`fechaDevolucionEsperada`). Both are calendar days stored at midnight UTC.
- Lifecycle: `PENDIENTE → APROBADA → ENTREGADA → DEVUELTA`, plus `RECHAZADA` and `CANCELADA` (a section can cancel while `PENDIENTE` or `APROBADA`).
- Availability is **calculated, not stored**: `cantidadTotal − cantidadMantenimiento − peak units reserved` by `APROBADA`/`ENTREGADA` loans that overlap the requested dates (see `lib/disponibilidad.ts`). An overdue `ENTREGADA` loan keeps its units reserved until it is returned.
- `PENDIENTE` requests do **not** reserve stock. Sections are warned when another section has a pending request competing for the same material, and the admin sees a *Conflicto* badge. Approval re-checks availability inside a transaction with row locks (`UPDLOCK, HOLDLOCK`) so two approvals can't commit the same units.
- On return, the admin records damaged units (moved to `cantidadMantenimiento`) and missing units (subtracted from `cantidadTotal`).
- Rejections store a code in `motivoRechazo` (labels in `lib/constantes.ts`) plus an optional `razonRechazo` detail, required only for `OTRO`.

## Analytics (`/admin/graficos`)

- Filters live in the URL (`?periodo=mes|3meses|anio|personalizado&desde=YYYY-MM-DD&hasta=YYYY-MM-DD&seccion=TROPA&pagina=2`). `lib/reportes/filtros.ts` parses them for both the page and the CSV routes (`/api/reportes/{prestamos|secciones|materiales|danos}`), so screen, print and export always match. Invalid values fall back to the default (last 3 months).
- `lib/reportes/consultas.ts` loads the period's rows and aggregates them in TypeScript; date rules (Costa Rica time, overlaps, grouping, utilization, CSV escaping) are pure functions in `lib/reportes/calculos.ts`, covered by `lib/reportes/reportes.test.ts`.
- The seed adds 11 historical loans over the last ~3 months so the charts have data.

## Troubleshooting

### "Cannot open database" or "No database exists"

The database `tcu_inventario_scout` must exist before running `db:push`. Create it:

```sql
-- Run this in SQL Server Management Studio or sqlcmd
CREATE DATABASE tcu_inventario_scout;
```

Then run:
```bash
pnpm run db:push
```

### "Database connection failed"

1. **Check SQL Server is running:**
   ```bash
   # Windows: verify SQL Server service is running in Services
   # Linux/Mac: check your Docker container or remote connection
   ```

2. **Test connection string:**
   ```bash
   pnpm run db:studio
   # If Prisma Studio opens, your connection is valid
   ```

3. **Verify database exists:**
   - Use SQL Server Management Studio to confirm `tcu_inventario_scout` exists
   - If not, create it (see "Cannot open database" above)
   - Update `DATABASE_URL` if using a different server/credentials

### "Command not found: pnpm"

Install pnpm globally:
```bash
npm install -g pnpm
pnpm --version  # verify installation
```

### Prisma Client errors

After any changes to `prisma/schema.prisma`, regenerate the client:
```bash
pnpm run db:generate
```

### `db:push` fails after a schema change (data loss warning)

When a schema change adds required columns or renames fields, `db:push` refuses to apply it over existing rows. On a **development** database you can drop everything and recreate it, then re-seed:

```bash
npx prisma db push --force-reset   # ⚠️ deletes ALL data in the database
pnpm run db:seed
```

Never run `--force-reset` against a database with real data.

### Port 3000 already in use

Run on a different port:
```bash
pnpm run dev -- -p 3001
```

### Module not found errors

Clear node_modules and reinstall:
```bash
pnpm install --force
# or with npm:
rm -r node_modules package-lock.json && npm install
```

## Project Structure

```
tcu-scout-inventory/
├── app/                    # Next.js pages and routes
├── components/             # Reusable React components
├── lib/                    # Utilities, auth, database config
├── types/                  # TypeScript type definitions
├── prisma/                 # Database schema and seed script
├── public/                 # Static assets
├── .env.local              # Environment variables (create this)
├── CLAUDE.md              # Development guidelines
└── package.json            # Project dependencies
```

## Key Technology Versions

- **Next.js** 16 (App Router)
- **React** 19
- **TypeScript** 5
- **Tailwind CSS** 4
- **Prisma** 7
- **NextAuth** 4
- **SQL Server** with `@prisma/adapter-mssql`

## Important Notes

⚠️ **Important:** Always run `pnpm run db:generate` after editing `prisma/schema.prisma`.

🔐 **Never commit `.env.local`** — it contains sensitive credentials. Use `.env.example` for documentation.

📝 **Language:** This project is **Spanish-only**. All UI text must be in Spanish. See `CLAUDE.md` for conventions.

## Need Help?

- Check `CLAUDE.md` for project conventions and architecture
- Read `AGENTS.md` for Next.js-specific guidance
- Review existing issues and PRs in the repository
- Ask your team lead or open an issue

---

**Happy coding! 🎉**
