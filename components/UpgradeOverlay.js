'use client';
import Link from 'next/link';
import { ArrowUpRight, Lock } from 'lucide-react';

/**
 * Full-page blur overlay shown to starter plan users on Growth-only pages.
 * Wraps the page content in a blurred container with a centered upgrade CTA.
 *
 * @param {string} feature  - Feature name shown in the message (e.g. "Purchase Orders")
 * @param {React.ReactNode} icon - Lucide icon component to display
 * @param {React.ReactNode} children - The page content to blur behind the overlay
 */
export default function UpgradeOverlay({ feature, icon: Icon, children }) {
  return (
    <div className="relative min-h-[500px]">
      {/* Blurred page content */}
      <div className="blur-[6px] select-none pointer-events-none opacity-70">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-start justify-center z-20 pt-32">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl px-8 py-8 text-center max-w-xs">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-orange-100 flex items-center justify-center">
            {Icon ? <Icon size={24} className="text-orange-500" /> : <Lock size={24} className="text-orange-500" />}
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Upgrade to Access {feature}
          </h3>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            {feature} is available on the <span className="font-semibold text-gray-700">Growth</span> plan.
            Upgrade to unlock this feature and grow your business.
          </p>
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition shadow-sm"
          >
            <ArrowUpRight size={15} /> Upgrade Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
