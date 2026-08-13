'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ActionLink } from '@/components/ui/Button';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen text-[#F0301A] max-w-md mx-auto px-4 pt-16 pb-24">
      <div className="hairline-all p-8 bg-[#EFE7DC] space-y-6">
        <div className="space-y-1">
          <span className="text-xs uppercase font-bold tracking-widest text-[#F0301A]">
            ● REGISTRATION / SPECIMEN ACCOUNT
          </span>
          <h1 className="font-display-grotesk font-black text-4xl uppercase tracking-tighter">
            CREATE ACCOUNT
          </h1>
        </div>

        {isSubmitted ? (
          <div className="space-y-4 py-4">
            <div className="p-3 bg-[#F0301A] text-[#EFE7DC] text-xs font-bold uppercase tracking-wider">
              ● REGISTRATION COMPLETE
            </div>
            <p className="font-sans text-sm text-[#161412]">
              Your account has been initialized. Welcome to the ++HELLOHELLO archive.
            </p>
            <ActionLink href="/shop" size="md">
              START EXPLORING ↗
            </ActionLink>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                FULL NAME
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="FIRST LAST"
                className="w-full bg-transparent border border-[#F0301A] px-3 py-2 text-[#161412] font-sans focus:outline-none focus:ring-1 focus:ring-[#F0301A]"
              />
            </div>

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

            <div className="pt-2">
              <ActionLink type="submit" size="lg" className="w-full justify-between">
                REGISTER ↗
              </ActionLink>
            </div>

            <div className="hairline-t pt-4 text-center text-xs font-sans text-[#161412]">
              Already registered?{' '}
              <Link href="/login" className="font-display-grotesk font-bold text-[#F0301A] uppercase underline">
                LOG IN HERE ↗
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
