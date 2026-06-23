import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardRedirect() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = (session.user as any).role || "USUARIO";
  redirect(role === "ADMIN" ? "/dashboard/admin" : "/dashboard/usuario");
}
