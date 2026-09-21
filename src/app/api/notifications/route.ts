import prisma from '@/lib/db';
import { ok, fail, serverError } from '@/lib/api';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 * Returns recent notifications and unread count for the current user.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return fail('Unauthorized', 401);
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      prisma.notification.count({
        where: { userId: session.user.id, read: false },
      }),
    ]);

    return ok({
      notifications: notifications.map((n) => ({
        id: n.id,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
      })),
      unreadCount,
    });
  } catch (error) {
    return serverError(error);
  }
}

/**
 * PATCH /api/notifications
 * Marks all notifications for the current user as read.
 */
export async function PATCH() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return fail('Unauthorized', 401);
    }

    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });

    return ok({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return serverError(error);
  }
}
