import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function UsuarioDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = (session.user as any).role || "USUARIO";
  if (role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-600">Scout Group #3</h1>
            <p className="text-gray-600">Bienvenido, {session.user.name}</p>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Materiales Disponibles</h3>
            <p className="text-3xl font-bold text-blue-600">0</p>
            <a href="/usuario/materiales" className="text-blue-500 hover:underline mt-2 text-sm">
              Ver materiales →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Mis Préstamos</h3>
            <p className="text-3xl font-bold text-green-600">0</p>
            <a href="/usuario/prestamos" className="text-blue-500 hover:underline mt-2 text-sm">
              Ver mis préstamos →
            </a>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">
            Bienvenido al Sistema de Inventario. Aquí puedes solicitar el préstamo de materiales.
          </p>
        </div>
      </main>
    </div>
  );
}
