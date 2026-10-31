'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface CustomerProfile {
  id: string;
  email: string;
  role: string;
  registeredAt: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string;
  city: string;
  postalCode: string | null;
  country: string | null;
  metrics: {
    totalOrders: number;
    savedWishlist: number;
    reviewsCount: number;
  };
  recentOrders: {
    id: string;
    total: number;
    status: string;
    date: string;
    invoiceNo: string | null;
  }[];
}

export default function CustomerAccountPage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customer/profile');
      const data = await res.json();
      if (data.success) {
        const p: CustomerProfile = data.data.profile;
        setProfile(p);
        setFirstName(p.firstName || '');
        setLastName(p.lastName || '');
        setPhone(p.phone || '');
        setAddress(p.address || '');
        setCity(p.city || '');
        setPostalCode(p.postalCode || '');
        setCountry(p.country || '');
      }
    } catch {
      setProfileMsg({ type: 'err', text: 'Failed to load profile details.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || null,
          address: address.trim(),
          city: city.trim(),
          postalCode: postalCode.trim() || null,
          country: country.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProfileMsg({ type: 'ok', text: 'Shipping address and profile updated successfully!' });
        await fetchProfile();
      } else {
        setProfileMsg({ type: 'err', text: data.error || 'Failed to update profile' });
      }
    } catch {
      setProfileMsg({ type: 'err', text: 'Network error occurred while saving profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'err', text: 'New password must be at least 8 characters long.' });
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordMsg({ type: 'ok', text: 'Password changed successfully! Keep it secure.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ type: 'err', text: data.error || 'Failed to update password' });
      }
    } catch {
      setPasswordMsg({ type: 'err', text: 'Network error occurred while changing password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 py-20 text-center font-display-grotesk font-bold text-xs uppercase tracking-widest">
        LOADING CUSTOMER ACCOUNT PROFILE...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen text-[#F0301A] max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display-grotesk font-black text-2xl uppercase tracking-tight mb-2">
          SESSION REQUIRED
        </h1>
        <p className="text-xs uppercase font-sans mb-6">
          Please log in to manage your customer account and shipping addresses.
        </p>
        <Link
          href="/login?callbackUrl=/account"
          className="px-6 py-2 bg-[#F0301A] text-[#EFE7DC] font-display-grotesk font-bold text-xs uppercase tracking-widest"
        >
          LOG IN TO PROCEED ↗
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Header */}
      <div className="border-b border-[#F0301A]/30 pb-6 mb-8 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-[#F0301A] text-[#EFE7DC]">
              {profile.role} ACCOUNT
            </span>
            <span className="text-[10px] font-mono text-[#161412]/60 uppercase">
              REGISTERED {new Date(profile.registeredAt).toLocaleDateString()}
            </span>
          </div>
          <h1 className="font-display-grotesk font-black text-3xl sm:text-5xl uppercase tracking-tight">
            ACCOUNT &amp; PROFILE CENTER
          </h1>
          <p className="text-xs uppercase font-bold tracking-widest text-[#F0301A]/70 mt-1">
            CLIENT: {profile.firstName} {profile.lastName} ({profile.email})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/orders"
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[#F0301A] hover:bg-[#F0301A] hover:text-[#EFE7DC] transition-colors"
          >
            ORDER HISTORY ↗
          </Link>
          <Link
            href="/wishlist"
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[#F0301A]/40 text-[#161412] hover:border-[#F0301A] transition-colors"
          >
            SAVED WISHLIST ({profile.metrics.savedWishlist}) ↗
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="hairline-all p-5 bg-[#FFFFFF]">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]/70">
            TOTAL ORDERS PLACED
          </div>
          <div className="font-display-grotesk font-black text-3xl md:text-4xl text-[#F0301A] mt-2">
            {profile.metrics.totalOrders}
          </div>
          <div className="text-[10px] font-sans text-[#161412]/60 mt-1 uppercase">
            Transactional orders in ledger
          </div>
        </div>

        <div className="hairline-all p-5 bg-[#FFFFFF]">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]/70">
            SAVED WISHLIST SPECIMENS
          </div>
          <div className="font-display-grotesk font-black text-3xl md:text-4xl text-[#F0301A] mt-2">
            {profile.metrics.savedWishlist}
          </div>
          <div className="text-[10px] font-sans text-[#161412]/60 mt-1 uppercase">
            Curated pieces saved for acquisition
          </div>
        </div>

        <div className="hairline-all p-5 bg-[#FFFFFF]">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]/70">
            REVIEWS &amp; APPRAISALS
          </div>
          <div className="font-display-grotesk font-black text-3xl md:text-4xl text-[#F0301A] mt-2">
            {profile.metrics.reviewsCount}
          </div>
          <div className="text-[10px] font-sans text-[#161412]/60 mt-1 uppercase">
            Verified product appraisals submitted
          </div>
        </div>
      </div>

      {/* Two Column Layout: Profile Details & Password Security */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Left Column: Shipping & Profile Details (8 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="hairline-all p-6 bg-[#FFFFFF]">
            <h2 className="font-display-grotesk font-black text-xl uppercase tracking-tight hairline-b pb-3 mb-4 text-[#F0301A]">
              DEFAULT SHIPPING &amp; CONTACT ADDRESS
            </h2>

            {profileMsg && (
              <div
                className={`p-3 text-xs font-bold uppercase mb-4 border ${
                  profileMsg.type === 'ok'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-red-100 text-red-800 border-red-300'
                }`}
              >
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-sans text-[#161412]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                    FIRST NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-[#EFE7DC]/40 border border-[#F0301A]/30 p-2 font-bold uppercase focus:outline-none focus:border-[#F0301A]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                    LAST NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-[#EFE7DC]/40 border border-[#F0301A]/30 p-2 font-bold uppercase focus:outline-none focus:border-[#F0301A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                    EMAIL ADDRESS (AUTHENTICATION)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full bg-[#EFE7DC]/60 border border-[#161412]/20 p-2 font-mono text-[#161412]/60 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                    CONTACT PHONE NUMBER
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-[#EFE7DC]/40 border border-[#F0301A]/30 p-2 font-mono uppercase focus:outline-none focus:border-[#F0301A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                  STREET ADDRESS *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 742 Evergreen Terrace, Apt 4B"
                  className="w-full bg-[#EFE7DC]/40 border border-[#F0301A]/30 p-2 font-bold uppercase focus:outline-none focus:border-[#F0301A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                    CITY *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#EFE7DC]/40 border border-[#F0301A]/30 p-2 font-bold uppercase focus:outline-none focus:border-[#F0301A]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                    POSTAL / ZIP CODE
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full bg-[#EFE7DC]/40 border border-[#F0301A]/30 p-2 font-mono uppercase focus:outline-none focus:border-[#F0301A]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                    COUNTRY
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. UNITED STATES"
                    className="w-full bg-[#EFE7DC]/40 border border-[#F0301A]/30 p-2 font-bold uppercase focus:outline-none focus:border-[#F0301A]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 bg-[#F0301A] text-[#EFE7DC] font-display-grotesk font-bold text-xs uppercase tracking-widest hover:bg-[#d02814] cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? 'SAVING PROFILE...' : 'SAVE SHIPPING ADDRESS'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Password & Account Security (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="hairline-all p-6 bg-[#FFFFFF]">
            <h2 className="font-display-grotesk font-black text-xl uppercase tracking-tight hairline-b pb-3 mb-4 text-[#F0301A]">
              ACCOUNT SECURITY &amp; CREDENTIALS
            </h2>

            {passwordMsg && (
              <div
                className={`p-3 text-xs font-bold uppercase mb-4 border ${
                  passwordMsg.type === 'ok'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-red-100 text-red-800 border-red-300'
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs font-sans text-[#161412]">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                  CURRENT PASSWORD
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#EFE7DC]/40 border border-[#F0301A]/30 p-2 font-mono focus:outline-none focus:border-[#F0301A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                  NEW PASSWORD (MIN 8 CHARACTERS)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#EFE7DC]/40 border border-[#F0301A]/30 p-2 font-mono focus:outline-none focus:border-[#F0301A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                  CONFIRM NEW PASSWORD
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#EFE7DC]/40 border border-[#F0301A]/30 p-2 font-mono focus:outline-none focus:border-[#F0301A]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-6 py-2.5 bg-[#161412] text-[#EFE7DC] font-display-grotesk font-bold text-xs uppercase tracking-widest hover:bg-black cursor-pointer disabled:opacity-50"
                >
                  {savingPassword ? 'UPDATING...' : 'CHANGE PASSWORD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="hairline-all p-6 bg-[#FFFFFF]">
        <div className="flex items-center justify-between hairline-b pb-3 mb-4">
          <h2 className="font-display-grotesk font-black text-xl uppercase tracking-tight text-[#F0301A]">
            RECENT PURCHASE ORDERS
          </h2>
          <Link
            href="/orders"
            className="text-xs font-bold uppercase tracking-wider text-[#F0301A] hover:underline"
          >
            VIEW ALL ({profile.metrics.totalOrders}) ↗
          </Link>
        </div>

        {profile.recentOrders.length === 0 ? (
          <p className="text-xs uppercase font-sans text-[#161412]/60 py-8 text-center">
            NO TRANSACTIONAL ORDERS RECORDED YET.{' '}
            <Link href="/shop" className="text-[#F0301A] font-bold underline">
              EXPLORE STOREFRONT ↗
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs uppercase font-sans">
              <thead className="bg-[#EFE7DC] border-b border-[#F0301A]/30 font-display-grotesk font-bold text-[#F0301A]">
                <tr>
                  <th className="p-3">ORDER IDENTIFIER</th>
                  <th className="p-3">DATE</th>
                  <th className="p-3">AMOUNT</th>
                  <th className="p-3">STATUS</th>
                  <th className="p-3 text-right">INVOICE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0301A]/10 text-[#161412]">
                {profile.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#EFE7DC]/30">
                    <td className="p-3 font-mono font-bold text-[#F0301A]">
                      {o.id.slice(0, 8)}...
                    </td>
                    <td className="p-3 font-mono text-[11px] text-[#161412]/70">
                      {new Date(o.date).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-mono font-bold text-[#161412]">
                      ${o.total.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold border border-[#F0301A]/30 bg-[#F0301A]/10 text-[#F0301A]">
                        {o.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/orders/${o.id}/invoice`}
                        target="_blank"
                        className="px-2 py-1 text-[10px] font-bold border border-[#F0301A]/30 hover:bg-[#F0301A] hover:text-[#EFE7DC] text-[#F0301A]"
                      >
                        INVOICE ↗
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
