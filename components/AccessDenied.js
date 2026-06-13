'use client';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

/**
 * Reusable Access Denied component for RBAC-guarded pages.
 * Displays a branded message and a link back to the dashboard.
 */
export default function AccessDenied({ message }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-5">
          <ShieldAlert size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-sm text-gray-500 mb-6">
          {message || 'You do not have permission to access this page.'}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
