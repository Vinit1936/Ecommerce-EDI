'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ActionLink } from '@/components/ui/Button';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (!result || result.error) {
        setError('Invalid email or password');
        return;
      }
      setIsSubmitted(true);
      // proxy.ts puts the originally requested path here when it redirects.
      const callbackUrl = searchParams.get('callbackUrl');
      router.replace(callbackUrl || '/shop');
      router.refresh();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-[#F0301A] max-w-md mx-auto px-4 pt-16 pb-24">
      <div className="hairline-all p-8 bg-[#EFE7DC] space-y-6">
        <div className="space-y-1">
          <span className="text-xs uppercase font-bold tracking-widest text-[#F0301A]">
            ● ACCESS / SPECIMEN ACCOUNT
          </span>
          <h1 className="font-display-grotesk font-black text-4xl uppercase tracking-tighter">
            LOG IN
          </h1>
        </div>

        {isSubmitted ? (
          <div className="space-y-4 py-4">
            <div className="p-3 bg-[#F0301A] text-[#EFE7DC] text-xs font-bold uppercase tracking-wider">
              ● ACCOUNT LOGGED IN (DEMO SESSION ACTIVE)
            </div>
            <p className="font-sans text-sm text-[#161412]">
              Welcome back, specimen collector. You can now access stored addresses and order histories.
            </p>
            <ActionLink href="/shop" size="md">
              CONTINUE SHOPPING ↗
            </ActionLink>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="collector@hellohello.studio"
                className="w-full bg-transparent border border-[#F0301A] px-3 py-2 text-[#161412] font-sans focus:outline-none focus:ring-1 focus:ring-[#F0301A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                PASSWORD
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent border border-[#F0301A] px-3 py-2 text-[#161412] font-sans focus:outline-none focus:ring-1 focus:ring-[#F0301A]"
              />
            </div>

            {error && (
              <div className="p-3 border border-[#F0301A] bg-[#F0301A]/10 text-xs font-bold uppercase tracking-wider text-[#F0301A]">
                ● {error}
              </div>
            )}

            <div className="pt-2">
              <ActionLink type="submit" size="lg" className="w-full justify-between" disabled={isLoading}>
                {isLoading ? 'SIGNING IN...' : 'LOG IN ↗'}
              </ActionLink>
            </div>

            <div className="hairline-t pt-4 text-center text-xs font-sans text-[#161412]">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-display-grotesk font-bold text-[#F0301A] uppercase underline">
                REGISTER HERE ↗
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center font-bold text-[#F0301A]">LOADING...</div>}
    >
      <LoginContent />
    </Suspense>
  );
}
