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
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useRouter, usePathname } from 'next/navigation';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useClerkUser();
  const router = useRouter();
  const pathname = usePathname();

  // Real-time Convex query — auto-updates when profile changes
  const baseProfile = useQuery(
    api.users.getByClerkId,
    isSignedIn && clerkUser ? { clerkId: clerkUser.id } : 'skip'
  );

  const linkExisting = useMutation(api.users.linkExistingByEmail);

  // Resilient fallback: lazy-link profile by email if Clerk ID isn't mapped in Convex yet
  useEffect(() => {
    if (isLoaded && isSignedIn && baseProfile === null && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress;
      if (email) {
        linkExisting({ clerkId: clerkUser.id, email }).catch(console.error);
      }
    }
  }, [isLoaded, isSignedIn, baseProfile, clerkUser, linkExisting]);

  // Keep compatibility by aliasing clerkId as uid
  const profile = baseProfile ? { ...baseProfile, uid: baseProfile.clerkId } : null;

  const loading = !isLoaded || (isSignedIn && baseProfile === undefined);

  // Redirect to onboarding if signed in but no tenant/shop set up yet
  useEffect(() => {
    if (isLoaded && isSignedIn && !loading) {
      const isSystemAdmin = clerkUser?.primaryEmailAddress?.emailAddress === 'cesaragabonthird@gmail.com';
      const isAdminPath = pathname.startsWith('/admin');

      if (isSystemAdmin && isAdminPath) {
        return;
      }

      const isOnboardingOrAuth = pathname.startsWith('/onboarding') || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
      
      // Redirect away from onboarding/auth pages if user already belongs to a tenant
      if (profile?.tenantId && isOnboardingOrAuth) {
        if (profile.role === 'installer') {
          router.replace('/portal');
        } else {
          router.replace('/dashboard');
        }
        return;
      }

      if ((!profile || !profile.tenantId) && !isOnboardingOrAuth) {
        router.replace('/onboarding');
        return;
      }

      // Lock installers out of main dashboard, send them to the portal
      if (profile && profile.role === 'installer' && pathname.startsWith('/dashboard')) {
        router.replace('/portal');
      }
    }
  }, [isLoaded, isSignedIn, loading, profile, pathname, router, clerkUser]);

  // Store tenantId in localStorage for imperative convex-api.js calls
  useEffect(() => {
    if (profile?.tenantId) {
      localStorage.setItem('autocrew_tenantId', profile.tenantId);
      localStorage.setItem('autocrew_branch',   profile.branchName || 'Main Branch');
      localStorage.setItem('autocrew_clerk_id', clerkUser?.id || '');
    }
  }, [profile?.tenantId, clerkUser?.id]);

  // Register PWA service worker on the client side
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
        .catch((err) => console.error('Service Worker registration failed:', err));
    }
  }, []);

  const isAdmin     = profile?.role === 'super_admin';
  const isInstaller = profile?.role === 'installer';
  const isManager   = profile?.role === 'branch_manager';
  const isSales     = profile?.role === 'sales_staff';
  const isStaff     = isSignedIn && !['super_admin','branch_manager'].includes(profile?.role || '');

  const subStatus = (() => {
    if (!profile) return 'suspended';
    if (profile.plan === 'starter') return 'active'; // Free Starter plan is permanently active
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

  const refresh = async () => {
    // Convex queries are reactive, no-op for backward compatibility
  };

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
      refresh,
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
