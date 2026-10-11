import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsuarioNavbar } from "@/components/layout/UsuarioNavBar";
import { MisPrestamos } from "@/components/prestamos/MisPrestamos";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Préstamos de la Sección | Scout Inventario",
};

export default async function UsuarioPrestamosPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");
  if ((session.user as any).role === "ADMIN") redirect("/dashboard/admin");

  return (
    <div className="min-h-screen bg-slate-50">
      <UsuarioNavbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Préstamos de la Sección</h1>
          <p className="text-sm text-slate-500 mt-1">
            Consulte el estado de las solicitudes de la sección y pida materiales para sus actividades.
          </p>
        </div>

        <MisPrestamos />
      </main>
    </div>
  );
}
