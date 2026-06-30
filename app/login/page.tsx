import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full">
        <LoginForm />
        <p className="text-center text-xs text-slate-400 mt-6">
          Trabajo Comunal Universitario &mdash; Costa Rica
        </p>
      </div>
    </div>
  );
}
