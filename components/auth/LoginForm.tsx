"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button, Input, Alert } from "@/components/common";
import { SignInSchema } from "@/lib/validations";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SignInSchemaType } from "@/lib/validations";

export function LoginForm() {
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInSchemaType>({
    resolver: zodResolver(SignInSchema),
  });

  const onSubmit = async (data: SignInSchemaType) => {
    setIsLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: true,
      callbackUrl: "/dashboard",
    });

    if (!result?.ok) {
      setError(result?.error || "Credenciales incorrectas");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header band */}
        <div className="bg-green-800 px-8 py-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/15 mb-4">
            <svg
              className="w-8 h-8 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-white">Sistema de Inventario</h1>
          <p className="text-sm text-green-200 mt-1">Grupo de Guías y Scouts #3</p>
        </div>

        {/* Form body */}
        <div className="px-8 py-8">
          <h2 className="text-base font-semibold text-slate-800 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {error && (
              <Alert type="error" onClose={() => setError("")}>
                {error}
              </Alert>
            )}

            <Input
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              placeholder="correo@ejemplo.com"
              {...register("email")}
              error={errors.email?.message}
            />

            <Input
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
              error={errors.password?.message}
            />

            <Button type="submit" className="w-full mt-2" isLoading={isLoading} size="lg">
              Ingresar
            </Button>
          </form>

          {/* Dev credentials */}
          <div className="mt-6 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-0.5">
            <p className="font-medium text-slate-600 mb-1">Credenciales de prueba</p>
            <p>Admin: admin@scoutgroup.com / admin123</p>
            <p>Usuario: usuario@scoutgroup.com / user123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
