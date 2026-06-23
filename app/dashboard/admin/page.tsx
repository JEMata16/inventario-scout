import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminNavBar } from "@/components/layout/AdminNavBar";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = (session.user as any).role || "USUARIO";
  if (role !== "ADMIN") {
    redirect("/usuario");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavBar />
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Materiales</h3>
            <p className="text-3xl font-bold text-blue-600">0</p>
            <a href="/admin/materiales" className="text-blue-500 hover:underline mt-2 text-sm">
              Ver módulo →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Solicitudes Pendientes</h3>
            <p className="text-3xl font-bold text-orange-600">0</p>
            <a href="/admin/prestamos" className="text-blue-500 hover:underline mt-2 text-sm">
              Ver módulo →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Análisis</h3>
            <p className="text-3xl font-bold text-green-600">-</p>
            <a href="/admin/graficos" className="text-blue-500 hover:underline mt-2 text-sm">
              Ver módulo →
            </a>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">
            Sistema de Inventario en desarrollo. Los módulos se rellenarán próximamente.
          </p>
        </div>
      </main>
    </div>
  );
}
