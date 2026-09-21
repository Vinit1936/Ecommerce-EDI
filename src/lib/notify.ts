/**
 * Notifications — Team 3 owns this helper; Team 2 calls it on order events.
 *
 * Deliberately a direct row insert rather than a queue: Redis/BullMQ is
 * deferred (see TODAY.md "Do NOT do these today"). Swap the body for a queue
 * publish later without changing any caller.
 */
import prisma from '@/lib/db';

export async function notify(input: { userId: string; message: string }) {
  try {
    await prisma.notification.create({ data: input });
  } catch (e) {
    console.error('[notify] failed to send', input, e);
  }
}

export async function notifyMany(inputs: { userId: string; message: string }[]) {
  await Promise.all(inputs.map(notify));
}
