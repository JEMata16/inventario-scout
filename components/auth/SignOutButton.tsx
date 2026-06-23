"use client";
import { signOut } from "next-auth/react";

interface SignOutButtonProps {
  variant?: "default" | "minimal";
}

export function SignOutButton({ variant = "default" }: SignOutButtonProps) {
  const handleClick = () => {
    signOut({ callbackUrl: "/login" });
  };

  if (variant === "minimal") {
    return (
      <button
        onClick={handleClick}
        className="text-gray-600 hover:text-red-600 transition"
      >
        Cerrar Sesión
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition"
    >
      Cerrar Sesión
    </button>
  );
}