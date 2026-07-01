import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { SignInSchema } from "./validations";
import { prisma } from "./db";

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
          const parsed = SignInSchema.safeParse(credentials);
          if (!parsed.success) return null;

          const { email, password } = parsed.data;

          const usuario = await prisma.usuario.findUnique({
            where: { email },
          });

          if (!usuario || !usuario.estado) return null;

          const passwordMatch = await bcrypt.compare(password, usuario.password);
          if (!passwordMatch) return null;

          return {
            id: String(usuario.id),
            email: usuario.email,
            name: `${usuario.nombre}${usuario.apellido ? " " + usuario.apellido : ""}`,
            role: usuario.rol,
          };
        } catch (error) {
          console.error("Error en authorize:", error);
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
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

export default NextAuth(authOptions);
