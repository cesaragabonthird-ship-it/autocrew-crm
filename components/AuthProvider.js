'use client';
/**
 * AuthProvider.js — Clerk version
 *
 * Previously this wrapped Firebase auth.
 * With Clerk, auth is provided by ClerkProvider in layout.js.
 * This file is kept for backwards compatibility with any page
 * that imports useAuth() — it now re-exports Clerk's useAuth.
 *
 * Pages that previously used:
 *   const { user, login, logout } = useAuth();
 *
 * Now get:
 *   const { isSignedIn, userId, signOut } = useAuth();
 *   (or use useUser() from UserContext for full profile)
 */
export { useAuth, useUser as useClerkUser } from '@clerk/nextjs';

/**
 * Thin compatibility shim — keeps old { user, logout } shape
 * so existing pages don't break.
 */
import { useAuth as useClerkAuth, useUser as useClerkUserHook } from '@clerk/nextjs';

export function useAuthCompat() {
  const { isSignedIn, isLoaded, signOut } = useClerkAuth();
  const { user } = useClerkUserHook();
  return {
    user:    isSignedIn ? user : null,
    loading: !isLoaded,
    logout:  signOut,
    // login/signup no longer needed — handled by Clerk UI
    login:   null,
    signup:  null,
  };
}
