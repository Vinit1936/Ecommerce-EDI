import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDashboardStats } from '@/lib/stats';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="hairline-all p-5">
      <div className="text-xs font-bold uppercase tracking-widest text-[#F0301A]/70">{label}</div>
      <div className="font-display-grotesk font-black text-3xl md:text-4xl tracking-tighter mt-2 text-[#F0301A]">
        {value}
      </div>
      {sub && <div className="text-xs font-sans text-[#161412]/60 mt-1">{sub}</div>}
    </div>
  );
}

/** Horizontal bars, sized relative to the largest value. No chart library. */
function Bars({ rows }: { rows: { label: string; value: number; caption: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-xs font-bold uppercase tracking-wider">
            <span className="truncate">{r.label}</span>
            <span className="text-[#161412]/70 shrink-0">{r.caption}</span>
          </div>
          <div className="h-2 w-full bg-[#F0301A]/10">
            <div
              className="h-full bg-[#F0301A]"
              style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login?callbackUrl=/dashboard');

  // proxy.ts only checks that a session cookie exists; the role check has to
  // happen here, where the database is reachable.
  if (session.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen max-w-3xl mx-auto px-4 pt-20 pb-24 text-[#F0301A]">
        <div className="hairline-all p-8 space-y-3">
          <h1 className="font-display-grotesk font-black text-3xl uppercase tracking-tighter">
            ACCESS DENIED
          </h1>
          <p className="font-sans text-sm text-[#161412]">
            The dashboard is restricted to administrators. You are signed in as{' '}
            <strong>{session.user.email}</strong> with the role{' '}
            <strong>{session.user.role}</strong>.
          </p>
          <Link href="/shop" className="inline-block text-xs font-bold uppercase underline">
            RETURN TO CATALOGUE ↗
          </Link>
        </div>
      </div>
    );
  }

  const [stats, auditCount, notificationCount] = await Promise.all([
    getDashboardStats(),
    prisma.auditLog.count(),
    prisma.notification.count(),
  ]);

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <h1 className="font-display-grotesk font-black text-4xl sm:text-6xl uppercase tracking-tighter">
          DASHBOARD
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider">
          <Link href="/dashboard/orders" className="hover:underline">
            ORDERS ↗
          </Link>
          <Link href="/dashboard/reports" className="hover:underline">
            REPORTS ↗
          </Link>
          <Link href="/dashboard/audit" className="hover:underline">
            AUDIT LOG ↗
          </Link>
          <Link href="/dashboard/health" className="hover:underline">
            HEALTH &amp; STATUS ↗
          </Link>
          <a href="/api/reports/export" className="hover:underline">
            EXPORT CSV ↓
          </a>
        </div>
      </div>
      <div className="hairline-b mb-8" />

      {/* Headline figures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat
          label="REVENUE"
          value={money(stats.revenue)}
          sub={`avg ${money(stats.averageOrderValue)} / order`}
        />
        <Stat label="ORDERS" value={String(stats.orderCount)} sub={`${stats.unitsSold} units sold`} />
        <Stat label="CUSTOMERS" value={String(stats.customerCount)} />
        <Stat label="PRODUCTS" value={String(stats.productCount)} sub={`${auditCount} audit entries`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Top products */}
        <section className="lg:col-span-7 hairline-all p-6 space-y-4">
          <h2 className="font-display-grotesk font-black text-xl uppercase tracking-tight hairline-b pb-3">
            TOP SPECIMENS BY UNITS
          </h2>
          {stats.topProducts.length === 0 ? (
            <p className="font-sans text-sm text-[#161412]/60">
              No orders yet. Place one to populate this.
            </p>
          ) : (
            <Bars
              rows={stats.topProducts.map((p) => ({
                label: p.name,
                value: p.units,
                caption: `${p.units} units · ${money(p.revenue)}`,
              }))}
            />
          )}
        </section>

        {/* Order status breakdown */}
        <section className="lg:col-span-5 hairline-all p-6 space-y-4">
          <h2 className="font-display-grotesk font-black text-xl uppercase tracking-tight hairline-b pb-3">
            ORDERS BY STATUS
          </h2>
          {stats.ordersByStatus.length === 0 ? (
            <p className="font-sans text-sm text-[#161412]/60">No orders yet.</p>
          ) : (
            <Bars
              rows={stats.ordersByStatus.map((s) => ({
                label: s.status,
                value: s.count,
                caption: String(s.count),
              }))}
            />
          )}
        </section>

        {/* Low stock */}
        <section className="lg:col-span-5 hairline-all p-6 space-y-3">
          <h2 className="font-display-grotesk font-black text-xl uppercase tracking-tight hairline-b pb-3">
            LOW STOCK
          </h2>
          {stats.lowStock.length === 0 ? (
            <p className="font-sans text-sm text-[#161412]/60">Everything is comfortably stocked.</p>
          ) : (
            <ul className="space-y-2">
              {stats.lowStock.map((p) => (
                <li key={p.sku} className="flex items-center justify-between gap-3 text-xs">
                  <Link
                    href={`/product/${p.sku}`}
                    className="font-bold uppercase tracking-wider truncate hover:underline"
                  >
                    {p.name}
                  </Link>
                  <span
                    className={`font-bold shrink-0 ${
                      p.stockQty === 0 ? 'text-[#F0301A]' : 'text-[#161412]/70'
                    }`}
                  >
                    {p.stockQty === 0 ? 'OUT OF STOCK' : `${p.stockQty} LEFT`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent orders */}
        <section className="lg:col-span-7 hairline-all p-6 space-y-3">
          <h2 className="font-display-grotesk font-black text-xl uppercase tracking-tight hairline-b pb-3">
            RECENT ORDERS
          </h2>
          {stats.recentOrders.length === 0 ? (
            <p className="font-sans text-sm text-[#161412]/60">Nothing yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left uppercase tracking-wider text-[#F0301A]/60">
                    <th className="pb-2 pr-3 font-bold">INVOICE</th>
                    <th className="pb-2 pr-3 font-bold">CUSTOMER</th>
                    <th className="pb-2 pr-3 font-bold">STATUS</th>
                    <th className="pb-2 font-bold text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="font-sans">
                  {stats.recentOrders.map((o) => (
                    <tr key={o.id} className="border-t border-[#F0301A]/15">
                      <td className="py-2 pr-3 font-bold font-display-grotesk">
                        {o.invoiceNo ?? o.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-2 pr-3 truncate">{o.customer}</td>
                      <td className="py-2 pr-3 uppercase">{o.status}</td>
                      <td className="py-2 text-right font-bold">{money(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="mt-8 text-xs font-sans text-[#161412]/50">
        {notificationCount} notifications delivered · figures aggregated in Postgres
      </div>
    </div>
  );
}
