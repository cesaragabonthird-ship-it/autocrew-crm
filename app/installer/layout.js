'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthCompat as useAuth } from '@/components/AuthProvider';
import { useUser } from '@/lib/UserContext';
import { LogOut, Wrench, Bell, Lock } from 'lucide-react';

export default function InstallerLayout({ children }) {
  const { user, logout } = useAuth();
  const { profile, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/'); return; }
    // If not installer role, redirect to main dashboard
    if (profile && profile.role !== 'installer') router.replace('/dashboard');
  }, [user, profile, loading, router]);

  const handleLogout = async () => { await logout(); router.push('/'); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/>
    </div>
  );

  if (profile && profile.plan === 'starter') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-800">
        <div className="bg-orange-100 border border-orange-200 p-4 rounded-2xl mb-6 text-orange-600">
          <Lock size={40} className="mx-auto" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Installer Portal Deactivated</h1>
        <p className="text-sm text-slate-500 max-w-sm mb-6">
          The Installer Portal is only available on the Growth and Pro plans. Please contact your shop administrator to upgrade your subscription.
        </p>
        <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl transition text-sm text-slate-700 font-bold border border-slate-300/40">
          <LogOut size={16}/> Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Mobile-first top bar */}
      <header className="bg-[#111827] border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logomark-white.png" alt="AutoCrew" className="h-7 w-7 object-contain" />
          <div>
            <p className="text-sm font-bold text-white leading-none">AutoCrew</p>
            <p className="text-xs text-slate-400 mt-0.5">Installer Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {profile && (
            <div className="text-right">
              <p className="text-xs font-bold text-white">{profile.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-semibold uppercase font-mono">{profile.branchName || profile.branch || ''}</p>
            </div>
          )}
          <button onClick={handleLogout} className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-slate-200 cursor-pointer">
            <LogOut size={17}/>
          </button>
        </div>
      </header>
      <main className="max-w-lg mx-auto">{children}</main>
    </div>
  );
}
