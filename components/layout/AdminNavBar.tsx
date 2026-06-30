"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";

const navItems = [
  { href: "/dashboard/admin", label: "Inicio" },
  { href: "/admin/materiales", label: "Materiales" },
  { href: "/admin/prestamos", label: "Préstamos" },
  { href: "/admin/graficos", label: "Análisis" },
];

export function AdminNavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header className="bg-green-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-semibold leading-none">Scouts #3</span>
              <span className="block text-[10px] text-green-300 leading-none mt-0.5">Inventario</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-green-100 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User area */}
          <div className="flex items-center gap-3">
            {session?.user?.name && (
              <span className="hidden sm:block text-sm text-green-200 max-w-[140px] truncate">
                {session.user.name}
              </span>
            )}
            <SignOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
