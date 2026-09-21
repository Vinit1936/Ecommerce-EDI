/**
 * POST /api/auth/register — create a customer account.
 *
 * The User row and its Customer profile are written in a single transaction:
 * a User without a Customer cannot place an order, so a half-finished signup
 * would leave an account that looks valid but breaks at checkout.
 */
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { ok, fail, serverError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return fail(first?.message ?? 'Invalid registration details', 422, parsed.error.issues);
    }

    const { fullName, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return fail('An account with that email already exists', 409);

    const customerRole = await prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
    if (!customerRole) return fail('CUSTOMER role missing — run `npm run seed`', 500);

    // "FIRST LAST" -> first / last; everything after the first space is surname.
    const [firstName, ...rest] = fullName.split(/\s+/);
    const lastName = rest.join(' ') || '-';

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, passwordHash, roleId: customerRole.id },
      });
      await tx.customer.create({
        data: {
          userId: created.id,
          firstName,
          lastName,
          address: '',
          city: '',
        },
      });
      return created;
    });

    await recordAudit({ userId: user.id, action: 'CREATE', entity: 'User', entityId: user.id });

    return ok({ user: { id: user.id, email: user.email } }, 201);
  } catch (e) {
    return serverError(e);
  }
}
