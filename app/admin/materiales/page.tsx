import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminNavBar } from "@/components/layout/AdminNavBar";
import { MaterialesManager } from "@/components/materiales/MaterialesManager";

export const metadata = { title: "Materiales — Scouts #3" };

export default async function MaterialesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard/usuario");

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Materiales</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gestión del inventario de materiales</p>
          </div>
        </div>

        <MaterialesManager />
      </main>
    </div>
  );
}