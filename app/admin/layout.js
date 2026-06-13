'use client';
import { useUser } from '@/lib/UserContext';
import { useAuthCompat as useAuth } from '@/components/AuthProvider';
import AccessDenied from '@/components/AccessDenied';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Users, CreditCard, BellRing, ChevronRight, Settings, LogOut } from 'lucide-react';

export default function AdminLayout({ children }) {
  const { logout } = useAuth();
  const { clerkUser, loading } = useUser();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
          <p className="text-sm font-semibold text-gray-500">Verifying administrator access...</p>
        </div>
      </div>
    );
  }

  const userEmail = clerkUser?.primaryEmailAddress?.emailAddress;
  const isSystemAdmin = userEmail === 'cesaragabonthird@gmail.com';

  if (!isSystemAdmin) {
    return <AccessDenied message="This panel is restricted to the platform owner only." />;
  }

  const navItems = [
    { label: 'Clients (Tenants)', href: '/admin/clients', icon: Users },
    { label: 'Payments Tracker', href: '/admin/payments', icon: CreditCard },
    { label: 'Reminders Console', href: '/admin/reminders', icon: BellRing },
    { label: 'Plans Editor', href: '/admin/plans', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111827] flex flex-col flex-shrink-0 overflow-hidden text-gray-300">
        {/* Title */}
        <div className="flex items-center gap-2.5 h-14 px-4 border-b border-white/10 flex-shrink-0">
          <Link href="/admin" className="flex items-center gap-2 min-w-0">
            <img src="/og-image-white.png" alt="AutoCrew" className="h-6 object-contain" />
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded ml-1.5">Owner</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-hide">
          <div className="text-[10px] font-bold text-gray-500 uppercase px-3 pb-2 tracking-wider">
            Platform Admin
          </div>
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-sm ${
                  active
                    ? 'bg-orange-500 text-white font-semibold shadow-md shadow-orange-500/10'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer info & Link back to Shop App */}
        <div className="p-3 border-t border-white/10 bg-[#1f2937]/30">
          <Link
            href="/dashboard"
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl hover:bg-white/5 text-xs text-amber-400 font-semibold transition mb-2 border border-amber-500/20"
          >
            <div className="flex items-center gap-2">
              <Shield size={14} />
              <span>Go to Shop App</span>
            </div>
            <ChevronRight size={12} />
          </Link>
          <div className="px-3 py-1.5 mb-2">
            <p className="text-[10px] text-gray-500 truncate">{clerkUser?.fullName || 'Platform Owner'}</p>
            <p className="text-[11px] text-gray-400 truncate font-mono">{userEmail}</p>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-red-500/20 hover:text-red-400 border border-transparent hover:border-red-500/10 transition text-sm font-semibold cursor-pointer"
          >
            <LogOut size={16} className="flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-w-0 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
