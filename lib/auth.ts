import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SignInSchema } from "./validations";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("Credenciales faltantes");
            return null;
          }
          console.log("Validando credenciales para:", credentials.email);
          const validatedCredentials = SignInSchema.parse({
            email: credentials.email,
            password: credentials.password,
          });
          
          if (validatedCredentials.email === "admin@scoutgroup.com" &&
              validatedCredentials.password === "admin123") {
            console.log("Login exitoso como ADMIN");
            return {
              id: "1",
              email: "admin@scoutgroup.com",
              name: "Administrador",
              role: "ADMIN",
            };
          }
          
          if (validatedCredentials.email === "usuario@scoutgroup.com" &&
              validatedCredentials.password === "user123") {
            console.log("Login exitoso como USUARIO");
            return {
              id: "2",
              email: "usuario@scoutgroup.com",
              name: "Usuario Test",
              role: "USER",
            };
          }
          
          console.log("Credenciales inválidas");
          return null;
        } catch (error: any) {
          console.error("Error en authorize:", error.message);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }: any) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: true,
};

export default NextAuth(authOptions);