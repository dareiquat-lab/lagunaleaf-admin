import type { NextAuthConfig } from "next-auth";

// Edge-compatible config — no Node.js-only imports (no bcrypt here)
export const authConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnLogin =
        nextUrl.pathname === "/" || nextUrl.pathname === "/login";

      if (isOnDashboard && !isLoggedIn) return false;
      if (isOnLogin && isLoggedIn)
        return Response.redirect(new URL("/dashboard", nextUrl));
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.email = user.email;
      return token;
    },
    async session({ session, token }) {
      if (token) session.user.email = token.email as string;
      return session;
    },
  },
  session: { strategy: "jwt" },
};
