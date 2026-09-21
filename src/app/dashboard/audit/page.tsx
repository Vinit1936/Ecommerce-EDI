import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login?callbackUrl=/dashboard/audit');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  const entries = await prisma.auditLog.findMany({
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <h1 className="font-display-grotesk font-black text-4xl sm:text-6xl uppercase tracking-tighter">
          AUDIT LOG
        </h1>
        <Link href="/dashboard" className="text-xs font-bold uppercase tracking-wider hover:underline">
          ← DASHBOARD
        </Link>
      </div>
      <div className="hairline-b mb-8" />

      {entries.length === 0 ? (
        <p className="font-sans text-sm text-[#161412]/60">
          Nothing recorded yet. Registering, ordering, paying or exporting writes here.
        </p>
      ) : (
        <div className="overflow-x-auto hairline-all p-6">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left uppercase tracking-wider text-[#F0301A]/60">
                <th className="pb-2 pr-3 font-bold">WHEN</th>
                <th className="pb-2 pr-3 font-bold">ACTOR</th>
                <th className="pb-2 pr-3 font-bold">ACTION</th>
                <th className="pb-2 pr-3 font-bold">ENTITY</th>
                <th className="pb-2 font-bold">ID</th>
              </tr>
            </thead>
            <tbody className="font-sans">
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-[#F0301A]/15">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 truncate">{e.user.email}</td>
                  <td className="py-2 pr-3 font-bold font-display-grotesk uppercase">{e.action}</td>
                  <td className="py-2 pr-3 uppercase">{e.entity}</td>
                  <td className="py-2 font-mono text-[10px] text-[#161412]/50">
                    {e.entityId.slice(0, 8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
