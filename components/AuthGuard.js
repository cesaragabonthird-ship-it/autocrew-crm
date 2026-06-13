'use client';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Client-side auth guard.
 * Most protection is handled by middleware.ts, but this is
 * used in layouts that need an extra check or loading state.
 */
export default function AuthGuard({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/sign-in');
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/>
      </div>
    );
  }

  if (!isSignedIn) return null;
  return children;
}
