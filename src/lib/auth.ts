import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (credentials?.password === "laguna420") {
          return { id: "admin", email: "admin@lagunaleaf.com", name: "Admin" };
        }
        return null;
      },
    }),
  ],
});
