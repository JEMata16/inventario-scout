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
    console.log("Intentando login con:", data.email);
    
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: true,
      callbackUrl: "/dashboard",
    });
    
    // This code only runs if redirect: false
    if (!result?.ok) {
      setError(result?.error || "Invalid credentials");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert type="error" title="Error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Input
        label="Email"
        type="email"
        {...register("email")}
        error={errors.email?.message}
      />

      <Input
        label="Contraseña"
        type="password"
        placeholder="••••••"
        {...register("password")}
        error={errors.password?.message}
      />

      <Button type="submit" className="w-full" isLoading={isLoading}>
        Iniciar Sesión
      </Button>

      <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
        <p className="font-semibold">Credenciales de Prueba:</p>
        <p>Admin: admin@scoutgroup.com / admin123</p>
        <p>Usuario: usuario@scoutgroup.com / user123</p>
      </div>
    </form>
  );
}
