import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminNavBar } from "@/components/layout/AdminNavBar";
import { PrestamosManager } from "@/components/prestamos/PrestamosManager";
import type { Metadata } from "next";
import { ESTADOS_SOLICITUD, FILTROS_OPERATIVOS, SECCIONES } from "@/lib/constantes";

export const metadata: Metadata = {
  title: "Gestión de Préstamos | Scout Inventario",
};

const ESTADOS_VALIDOS: string[] = [...ESTADOS_SOLICITUD, ...FILTROS_OPERATIVOS.map((f) => f.value)];
const SECCIONES_VALIDAS: string[] = SECCIONES.map((s) => s.value);

export default async function AdminPrestamosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard/usuario");

  const params = await searchParams;
  const estado = typeof params.estado === "string" && ESTADOS_VALIDOS.includes(params.estado) ? params.estado : "";
  const seccion = typeof params.seccion === "string" && SECCIONES_VALIDAS.includes(params.seccion) ? params.seccion : "";

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Préstamos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Revise y gestione las solicitudes de préstamo de materiales.
          </p>
        </div>

        {/* key: si cambia el filtro en la URL, el panel se reinicia con él */}
        <PrestamosManager key={`${estado}|${seccion}`} estadoInicial={estado} seccionInicial={seccion} />
      </main>
    </div>
  );
}
