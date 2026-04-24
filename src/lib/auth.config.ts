import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      session.user.role = token.role as string
      session.user.id = token.id as string
      return session
    },
  },
  providers: [], // Credentials provider added in auth.ts (Node.js only)
}
