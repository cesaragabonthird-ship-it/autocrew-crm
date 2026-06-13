'use client';
/**
 * lib/UserContext.js — Convex version
 * Replaces the Google Sheets version.
 * Drop this file into your existing lib/ folder.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { user, loading: authLoading } = useAuth();

  // Real-time query — auto-updates when user profile changes in Convex
  const convexUser = useQuery(
    api.users.getByUid,
    user ? { uid: user.uid } : "skip"
  );

  const profile  = convexUser || null;
  const loading  = authLoading || (user && convexUser === undefined);

  // Store tenantId in localStorage for convex-api.js imperative calls
  useEffect(() => {
    if (profile?.tenantId) {
      localStorage.setItem("autocrew_tenantId", profile.tenantId);
      localStorage.setItem("autocrew_branch",   profile.branchName || "Main Branch");
    }
  }, [profile?.tenantId]);

  const isAdmin     = profile?.role === 'super_admin';
  const isInstaller = profile?.role === 'installer';
  const isManager   = profile?.role === 'branch_manager';
  const isSales     = profile?.role === 'sales_staff';
  const isStaff     = !['super_admin','branch_manager'].includes(profile?.role || '');

  // Subscription status derived from tenant data
  const subStatus = (() => {
    if (!profile) return 'suspended';
    const status = profile.status;
    if (status === 'active') return 'active';
    if (status === 'trial') {
      const left = Math.ceil((new Date(profile.trialEndsAt || 0) - new Date()) / 864e5);
      return left > 0 ? 'trial' : 'trial_ended';
    }
    return status || 'suspended';
  })();

  const trialDaysLeft = profile?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(profile.trialEndsAt) - new Date()) / 864e5))
    : 0;

  const billingDaysLeft = profile?.nextBillingDate
    ? Math.ceil((new Date(profile.nextBillingDate) - new Date()) / 864e5)
    : null;

  return (
    <UserContext.Provider value={{
      profile, loading, isAdmin, isInstaller, isManager, isSales, isStaff,
      subStatus, trialDaysLeft, billingDaysLeft,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside UserProvider');
  return ctx;
};
