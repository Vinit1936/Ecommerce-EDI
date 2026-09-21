/**
 * Authentication + authorization foundation.
 *
 * NextAuth v5 (beta) with a Credentials provider backed by Postgres. The
 * session uses the JWT strategy, so `proxy.ts` can gate routes on cookie
 * presence alone without opening a database connection at the edge.
 *
 * The token deliberately carries `customerId` as well as `userId`: Team 2's
 * cart and order routes are keyed on Customer, not User, and re-querying it
 * on every request would be wasteful.
 *
 * Helpers for route handlers and server components:
 *   getSession()            -> session or null
 *   requireAuth()           -> session, throws if signed out
 *   requireRole('ADMIN')    -> session, throws unless the role matches
 */
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

// --- Type augmentation so session.user.role type-checks everywhere ---------
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      customerId: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    role: string;
    customerId: string | null;
  }
}

// next-auth/jwt only re-exports @auth/core/jwt, so the augmentation has to
// target the module that actually declares the JWT interface.
declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    role: string;
    customerId: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '').trim().toLowerCase();
        const password = String(credentials?.password ?? '');
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { role: true, customer: { select: { id: true } } },
        });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Best-effort; never block a valid login on this write.
        prisma.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => {});

        return {
          id: user.id,
          email: user.email,
          role: user.role.name,
          customerId: user.customer?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.customerId = user.customerId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.customerId = token.customerId;
      }
      return session;
    },
  },
});

// --- Guards ----------------------------------------------------------------

/** Current session, or null when signed out. */
export async function getSession() {
  return auth();
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Session for a signed-in user. Throws AuthError(401) otherwise. */
export async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) throw new AuthError('Authentication required', 401);
  return session;
}

/** Session for a signed-in user holding one of `roles`. Throws 401 or 403. */
export async function requireRole(...roles: string[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    throw new AuthError(`Requires role: ${roles.join(' or ')}`, 403);
  }
  return session;
}

/**
 * Session guaranteed to carry a customerId — the common case for cart and
 * order routes, which cannot act on a User that has no Customer profile.
 */
export async function requireCustomer() {
  const session = await requireAuth();
  if (!session.user.customerId) {
    throw new AuthError('No customer profile linked to this account', 403);
  }
  return { session, customerId: session.user.customerId };
}
