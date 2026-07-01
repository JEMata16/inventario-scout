import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsuarioNavbar } from "@/components/layout/UsuarioNavBar";
import { MaterialesCatalogo } from "@/components/materiales/MaterialesCatalogo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Materiales Disponibles | Scout Inventario",
};

export default async function UsuarioMaterialesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = (session.user as any).role || "USUARIO";
  if (role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <UsuarioNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Materiales Disponibles</h1>
          <p className="text-sm text-slate-500 mt-1">
            Consulte el catálogo de materiales disponibles para préstamo.
          </p>
        </div>

        <MaterialesCatalogo />
      </main>
    </div>
  );
}
