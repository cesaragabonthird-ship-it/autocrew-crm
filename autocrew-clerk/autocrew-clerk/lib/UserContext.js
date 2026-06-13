'use client';
/**
 * lib/UserContext.js — Clerk + Convex version
 *
 * Uses Clerk for identity and Convex for the user profile/role.
 * Real-time: if admin changes a user's role in Convex,
 * this context updates automatically via useQuery.
 */
import { createContext, useContext, useEffect } from 'react';
import { useUser as useClerkUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useClerkUser();

  // Real-time Convex query — auto-updates when profile changes
  const profile = useQuery(
    api.users.getByClerkId,
    isSignedIn && clerkUser ? { clerkId: clerkUser.id } : 'skip'
  );

  const loading = !isLoaded || (isSignedIn && profile === undefined);

  // Store tenantId in localStorage for imperative convex-api.js calls
  useEffect(() => {
    if (profile?.tenantId) {
      localStorage.setItem('autocrew_tenantId', profile.tenantId);
      localStorage.setItem('autocrew_branch',   profile.branchName || 'Main Branch');
      localStorage.setItem('autocrew_clerk_id', clerkUser?.id || '');
    }
  }, [profile?.tenantId, clerkUser?.id]);

  const isAdmin     = profile?.role === 'super_admin';
  const isInstaller = profile?.role === 'installer';
  const isManager   = profile?.role === 'branch_manager';
  const isSales     = profile?.role === 'sales_staff';
  const isStaff     = isSignedIn && !['super_admin','branch_manager'].includes(profile?.role || '');

  const subStatus = (() => {
    if (!profile) return 'suspended';
    if (profile.status === 'active') return 'active';
    if (profile.status === 'trial') {
      const left = Math.ceil((new Date(profile.trialEndsAt || 0) - new Date()) / 864e5);
      return left > 0 ? 'trial' : 'trial_ended';
    }
    return profile.status || 'suspended';
  })();

  const trialDaysLeft = profile?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(profile.trialEndsAt) - new Date()) / 864e5))
    : 0;

  const billingDaysLeft = profile?.nextBillingDate
    ? Math.ceil((new Date(profile.nextBillingDate) - new Date()) / 864e5)
    : null;

  return (
    <UserContext.Provider value={{
      // Clerk identity
      clerkUser,
      clerkId:    clerkUser?.id || null,
      // Convex profile
      profile,
      loading,
      // Role flags
      isAdmin, isInstaller, isManager, isSales, isStaff,
      // Subscription
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
