"use client";
import { useSession } from "next-auth/react";
import { SignOutButton } from "@/components/auth/SignOutButton";

export function UsuarioNavbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">Mi Portal - Usuario</h1>
          <div className="flex items-center gap-4">
            <p className="text-gray-600">{session?.user?.name}</p>
            <SignOutButton variant="minimal" />
          </div>
        </div>
      </div>
    </nav>
  );
}