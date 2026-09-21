import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDashboardStats, getTopCustomers } from '@/lib/stats';

export const dynamic = 'force-dynamic';

const money = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function ReportsPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login?callbackUrl=/dashboard/reports');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  const [stats, topCustomers] = await Promise.all([getDashboardStats(), getTopCustomers(10)]);
  const maxRevenue = Math.max(1, ...stats.salesByDay.map((d) => d.revenue));

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <h1 className="font-display-grotesk font-black text-4xl sm:text-6xl uppercase tracking-tighter">
          REPORTS
        </h1>
        <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
          <Link href="/dashboard" className="hover:underline">← DASHBOARD</Link>
          <a href="/api/reports/export" className="hover:underline">EXPORT CSV ↓</a>
        </div>
      </div>
      <div className="hairline-b mb-8" />

      {/* Sales by day */}
      <section className="hairline-all p-6 mb-8">
        <h2 className="font-display-grotesk font-black text-xl uppercase tracking-tight hairline-b pb-3 mb-4">
          SALES — LAST 14 DAYS
        </h2>
        {stats.salesByDay.length === 0 ? (
          <p className="font-sans text-sm text-[#161412]/60">No orders in this window yet.</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {stats.salesByDay.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-2 min-w-0">
                <span className="text-[10px] font-bold text-[#161412]/70">{money(d.revenue)}</span>
                <div
                  className="w-full bg-[#F0301A]"
                  style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 100)}%` }}
                  title={`${d.orders} orders`}
                />
                <span className="text-[10px] font-bold uppercase text-[#F0301A]/60 truncate w-full text-center">
                  {d.day.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Top customers */}
      <section className="hairline-all p-6">
        <h2 className="font-display-grotesk font-black text-xl uppercase tracking-tight hairline-b pb-3 mb-4">
          TOP CUSTOMERS BY SPEND
        </h2>
        {topCustomers.length === 0 ? (
          <p className="font-sans text-sm text-[#161412]/60">No customer orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left uppercase tracking-wider text-[#F0301A]/60">
                  <th className="pb-2 pr-3 font-bold">CUSTOMER</th>
                  <th className="pb-2 pr-3 font-bold">EMAIL</th>
                  <th className="pb-2 pr-3 font-bold">CITY</th>
                  <th className="pb-2 pr-3 font-bold text-right">ORDERS</th>
                  <th className="pb-2 font-bold text-right">SPEND</th>
                </tr>
              </thead>
              <tbody className="font-sans">
                {topCustomers.map((c) => (
                  <tr key={c.email} className="border-t border-[#F0301A]/15">
                    <td className="py-2 pr-3 font-bold font-display-grotesk uppercase">{c.name}</td>
                    <td className="py-2 pr-3 truncate">{c.email}</td>
                    <td className="py-2 pr-3">{c.city}</td>
                    <td className="py-2 pr-3 text-right">{c.orders}</td>
                    <td className="py-2 text-right font-bold">{money(c.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
