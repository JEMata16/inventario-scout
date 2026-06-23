import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas
  if (pathname === "/login" || pathname === "/") {
    return NextResponse.next();
  }

  // El resto de rutas requieren autenticación
  // NextAuth maneja la redirección automáticamente
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|static|.*\\..*).*)"],
};
