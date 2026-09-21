'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface NotificationItem {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch {
      /* fallback */
    }
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) return null;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) {
            handleMarkAllAsRead();
          }
        }}
        className="relative p-1.5 text-[#F0301A] hover:opacity-80 cursor-pointer flex items-center justify-center font-display-grotesk"
        title="Notifications"
        aria-label="Notifications"
      >
        <span className="text-base sm:text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#F0301A] text-[#EFE7DC] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#EFE7DC] border border-[#F0301A] shadow-xl z-50 text-[#161412] font-sans">
          {/* Header */}
          <div className="p-3 border-b border-[#F0301A]/30 flex items-center justify-between font-display-grotesk font-bold text-xs text-[#F0301A]">
            <span>SYSTEM DISPATCHES</span>
            {notifications.some((n) => !n.read) && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="text-[10px] uppercase underline hover:opacity-80 cursor-pointer disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#F0301A]/10">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs font-bold uppercase tracking-wider text-[#F0301A]/60 font-display-grotesk">
                NO SYSTEM NOTIFICATIONS
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 text-xs space-y-1 transition-colors ${
                    !n.read ? 'bg-[#FFFFFF]/70' : 'hover:bg-[#FFFFFF]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-[#161412] leading-snug">
                      {n.message}
                    </p>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F0301A] shrink-0 mt-1" />
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-[#F0301A]/70 uppercase">
                    {new Date(n.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {new Date(n.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
