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
        className="text-sm text-slate-400 hover:text-white transition-colors duration-150 cursor-pointer"
      >
        Cerrar sesión
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-white/20 text-white hover:bg-white/10 active:bg-white/20 transition-colors duration-150 cursor-pointer"
    >
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25z"
          clipRule="evenodd"
        />
        <path
          fillRule="evenodd"
          d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-1.048a.75.75 0 1 0-1.06-1.06l-2.328 2.327a.75.75 0 0 0 0 1.061l2.327 2.328a.75.75 0 1 0 1.061-1.06l-1.048-1.049h9.546A.75.75 0 0 0 19 10z"
          clipRule="evenodd"
        />
      </svg>
      Cerrar sesión
    </button>
  );
}
