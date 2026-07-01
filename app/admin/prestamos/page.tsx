import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminNavBar } from "@/components/layout/AdminNavBar";
import { PrestamosManager } from "@/components/prestamos/PrestamosManager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestión de Préstamos | Scout Inventario",
};

export default async function AdminPrestamosPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard/usuario");

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

        <PrestamosManager />
      </main>
    </div>
  );
}
