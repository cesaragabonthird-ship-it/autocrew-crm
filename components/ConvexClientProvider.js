'use client';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { useAuth } from '@clerk/nextjs';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Prevent Next.js Turbopack dev server from showing the full-page red overlay
// for handled Convex validation errors and plan limit restrictions.
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.map(arg => {
      if (arg instanceof Error) return arg.message;
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg); } catch { return String(arg); }
      }
      return String(arg);
    }).join(' ');

    const isHandledLimitOrValidationError =
      message.includes('[CONVEX') ||
      message.includes('limit reached') ||
      message.includes('only have 1 Super Admin') ||
      message.includes('branch(es) allowed') ||
      message.includes('installer(s) allowed') ||
      message.includes('product SKU(s) allowed');

    if (isHandledLimitOrValidationError) {
      console.warn(...args);
      return;
    }
    originalError(...args);
  };
}

/**
 * ConvexProviderWithClerk automatically passes the Clerk session token
 * to Convex, so all Convex queries/mutations are authenticated.
 * No manual token handling needed.
 */
export function ConvexClientProvider({ children }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
