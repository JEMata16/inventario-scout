import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { UsuarioNavbar } from "@/components/layout/UsuarioNavBar";
import { prisma } from "@/lib/db";

export default async function UsuarioDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = (session.user as any).role || "USUARIO";
  if (role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  const usuarioId = parseInt(session.user.id, 10);

  const [materialesDisponibles, prestamosActivos] = await Promise.all([
    prisma.material.count({ where: { estado: "DISPONIBLE" } }),
    prisma.solicitudPrestamo.count({
      where: { usuarioId, estado: { in: ["PENDIENTE", "APROBADA"] } },
    }),
  ]);

  const statCards = [
    {
      label: "Materiales Disponibles",
      value: String(materialesDisponibles),
      description: "artículos disponibles",
      href: "/usuario/materiales",
      linkText: "Ver materiales",
      accent: "border-green-500",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
        />
      ),
    },
    {
      label: "Mis Préstamos",
      value: String(prestamosActivos),
      description: "solicitudes activas",
      href: "/usuario/prestamos",
      linkText: "Ver mis préstamos",
      accent: "border-sky-500",
      iconBg: "bg-sky-50",
      iconColor: "text-sky-600",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <UsuarioNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Mi Portal</h1>
          <p className="text-sm text-slate-500 mt-1">
            Bienvenido, <span className="font-medium text-slate-700">{session.user.name}</span>
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 ${card.accent} p-6 flex flex-col gap-4`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{card.description}</p>
                </div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${card.iconBg}`}>
                  <svg
                    className={`w-5 h-5 ${card.iconColor}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    aria-hidden="true"
                  >
                    {card.icon}
                  </svg>
                </div>
              </div>
              <a
                href={card.href}
                className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 transition-colors"
              >
                {card.linkText}
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z" />
                </svg>
              </a>
            </div>
          ))}
        </div>

        {/* Welcome info */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
            <svg className="w-3 h-3 text-green-600" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
              <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
            </svg>
          </div>
          <p className="text-sm text-green-700">
            Bienvenido al Sistema de Inventario. Aquí puedes consultar materiales disponibles y gestionar tus solicitudes de préstamo.
          </p>
        </div>
      </main>
    </div>
  );
}
