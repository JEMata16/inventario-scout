import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

type Rol = "ADMIN" | "USUARIO";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    role: Rol;
    seccion?: string | null;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Rol;
    seccion?: string | null;
  }
}
