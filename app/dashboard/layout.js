'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthCompat as useAuth } from '@/components/AuthProvider';
import { useUser } from '@/lib/UserContext';
import AuthGuard from '@/components/AuthGuard';
import { branchesAPI, teamAPI } from '@/lib/convex-api';
import {
  LayoutDashboard, Package, ShoppingCart, Truck,
  Users, FileText, ClipboardList, Receipt, DollarSign,
  BarChart3, GitBranch, Settings, LogOut, Menu, ChevronLeft,
  Shield, Bell, Wrench, UserCheck, TrendingUp, Banknote,
  ChevronDown, Lock, Clock, CreditCard,
} from 'lucide-react';

const NAV_GROUPS = [
  { label:'Overview', items:[
    { label:'Dashboard',      href:'/dashboard',                   icon:LayoutDashboard },
  ]},
  { label:'Inventory', items:[
    { label:'Products',       href:'/dashboard/inventory',         icon:Package      },
    { label:'Purchase Orders',href:'/dashboard/purchase-orders',   icon:ShoppingCart },
    { label:'Deliveries',     href:'/dashboard/deliveries',        icon:Truck        },
  ]},
  { label:'Sales', items:[
    { label:'Customers',      href:'/dashboard/customers',         icon:Users        },
    { label:'Quotations',     href:'/dashboard/quotations',        icon:FileText     },
    { label:'Job Orders',     href:'/dashboard/job-orders',        icon:ClipboardList},
    { label:'Invoices',       href:'/dashboard/invoices',          icon:Receipt      },
    { label:'Payments',       href:'/dashboard/payments',          icon:DollarSign   },
  ]},
  { label:'People', items:[
    { label:'Team',           href:'/dashboard/team',              icon:UserCheck,   roles:['super_admin','branch_manager'] },
    { label:'Payroll',        href:'/dashboard/payroll',           icon:Banknote,    roles:['super_admin','branch_manager'] },
    { label:'Clock In Portal',href:'/portal',                      icon:Clock },
    { label:'Kiosk Mode',     href:'/portal/kiosk',                icon:Shield,      roles:['super_admin','branch_manager'] },
  ]},
  { label:'Insights', items:[
    { label:'Reports',        href:'/dashboard/reports',           icon:BarChart3,   roles:['super_admin','branch_manager'] },
  ]},
  { label:'Config', items:[
    { label:'Branches',       href:'/dashboard/branches',          icon:GitBranch,   roles:['super_admin'] },
    { label:'Subscription',   href:'/dashboard/billing',           icon:CreditCard,  roles:['super_admin'] },
    { label:'Settings',       href:'/dashboard/settings',          icon:Settings,    roles:['super_admin'] },
  ]},
];

/** Filter navigation groups based on user role */
function getFilteredNav(role) {
  return NAV_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.roles || item.roles.includes(role)),
    }))
    .filter(group => group.items.length > 0);
}

export default function DashboardLayout({ children }) {
  const { logout }              = useAuth();
  const { profile, isAdmin, isSystemAdmin, subStatus, trialDaysLeft, billingDaysLeft } = useUser();
  const router                  = useRouter();
  const pathname                = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const branchRef = useRef(null);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Fetch available branches for the tenant
  useEffect(() => {
    if (profile?.tenantId) {
      branchesAPI.getAll().then(setBranches).catch(() => {});
    }
  }, [profile?.tenantId]);

  // Close branch dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (branchRef.current && !branchRef.current.contains(e.target)) {
        setBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const switchBranch = async (branch) => {
    setBranchDropdownOpen(false);
    if (!profile?._id) return;
    const branchName = branch ? branch.name : undefined;
    const branchId = branch ? String(branch._id || branch.id) : undefined;
    try {
      await teamAPI.update(profile._id, { branchName, branchId });
      // Update localStorage so imperative API calls use the new branch
      if (branchName) {
        localStorage.setItem('autocrew_branch', branchName);
      } else {
        localStorage.removeItem('autocrew_branch');
      }
      // Force page reload to re-fetch data for the new branch
      window.location.reload();
    } catch (err) {
      console.error('Failed to switch branch:', err);
    }
  };

  const handleLogout = async () => { await logout(); router.push('/'); };

  const statusPill = () => {
    if (subStatus === 'trial')  return { text:`Trial: ${trialDaysLeft}d left`,  cls:'bg-amber-500/20 text-amber-300' };
    if (subStatus === 'grace')  return { text:'Payment overdue',                cls:'bg-red-500/20 text-red-300'    };
    if (subStatus === 'active' && billingDaysLeft !== null && billingDaysLeft <= 7)
                                return { text:`Due in ${billingDaysLeft}d`,     cls:'bg-orange-500/20 text-orange-300' };
    if (subStatus === 'active') return { text:'Active',                         cls:'bg-emerald-500/20 text-emerald-300' };
    return null;
  };
  const pill = statusPill();

  return (
    <AuthGuard>
      <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gray-50">
        {/* Mobile Header Bar */}
        <header className="flex md:hidden items-center justify-between h-14 bg-[#111827] px-4 border-b border-white/10 z-30 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-400 hover:text-white p-1 rounded-lg focus:outline-none"
          >
            <Menu size={20} />
          </button>
          <Link href="/dashboard" className="flex items-center justify-center">
            <img src="/og-image-white.png" alt="AutoCrew" className="h-8 object-contain" />
          </Link>
          <div className="w-8" />
        </header>

        {/* Backdrop overlay for mobile sidebar */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/45 z-40 md:hidden transition-opacity duration-200"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-[#111827] transition-all duration-200
          md:static md:translate-x-0
          ${collapsed ? 'md:w-[60px]' : 'md:w-56'}
          ${mobileOpen ? 'w-56 translate-x-0' : 'w-56 -translate-x-full md:w-56 md:translate-x-0'}
        `}>
          {/* Logo */}
          <div className="flex items-center h-14 px-3 border-b border-white/10 flex-shrink-0 relative">
            {!collapsed && (
              <Link href="/dashboard" className="mx-auto flex items-center justify-center h-9">
                <img src="/og-image-white.png" alt="AutoCrew" className="h-9 object-contain" />
              </Link>
            )}
            {collapsed && (
              <Link href="/dashboard" className="mx-auto flex items-center justify-center">
                <img src="/logomark-white.png" alt="AutoCrew" className="h-9 w-9 object-contain" />
              </Link>
            )}
            {!collapsed && (
              <button onClick={()=>setCollapsed(true)} className="absolute right-3 text-gray-500 hover:text-white transition p-1 rounded flex-shrink-0 md:block hidden">
                <ChevronLeft size={15}/>
              </button>
            )}
            {/* Mobile Close Button */}
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 text-gray-400 hover:text-white transition p-1 rounded flex-shrink-0 md:hidden block">
              <ChevronLeft size={18}/>
            </button>
          </div>
          {collapsed && (
            <button onClick={()=>setCollapsed(false)} className="flex justify-center py-2.5 text-gray-500 hover:text-white transition border-b border-white/10">
              <Menu size={15}/>
            </button>
          )}

          {/* Branch switcher + Status pill */}
          {!collapsed && profile && (
            <div className="mx-3 mt-3 space-y-1.5">
              <div className="relative" ref={branchRef}>
                <button
                  onClick={() => isAdmin && branches.length > 0 && setBranchDropdownOpen(o => !o)}
                  className={`w-full bg-white/5 rounded-lg px-3 py-1.5 text-left ${isAdmin && branches.length > 0 ? 'hover:bg-white/10 cursor-pointer' : ''} transition`}
                >
                  <p className="text-xs text-gray-500">Branch</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-white truncate">{profile.branchName || 'All Branches'}</p>
                    {isAdmin && branches.length > 0 && <ChevronDown size={12} className={`text-gray-400 transition-transform ${branchDropdownOpen ? 'rotate-180' : ''}`} />}
                  </div>
                </button>
                {branchDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-[#1f2937] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => switchBranch(null)}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition ${!profile.branchName ? 'text-orange-400 font-semibold' : 'text-gray-300'}`}
                    >
                      All Branches
                    </button>
                    {branches.map(b => (
                      <button
                        key={b._id || b.id}
                        onClick={() => switchBranch(b)}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition ${profile.branchName === b.name ? 'text-orange-400 font-semibold' : 'text-gray-300'}`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {pill && (
                <Link href="/dashboard/billing">
                  <div className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${pill.cls}`}>{pill.text}</div>
                </Link>
              )}
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 mt-2 scrollbar-hide">
            {getFilteredNav(profile?.role).map(group => (
              <div key={group.label}>
                {!collapsed && <p className="text-xs font-semibold text-gray-600 uppercase px-2 pt-3 pb-1 tracking-wider">{group.label}</p>}
                {collapsed && <div className="my-1 border-t border-white/5"/>}
                {group.items.map(({ label, href, icon: Icon }) => {
                  const active = pathname === href;
                  const isGatedByPlan = ['/dashboard/purchase-orders', '/dashboard/deliveries', '/dashboard/payroll', '/portal', '/portal/kiosk'].includes(href) && profile?.plan === 'starter';
                  return (
                    <Link key={href} href={href} title={collapsed ? label : undefined}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition text-sm ${
                        active
                          ? 'bg-orange-500 text-white'
                          : isGatedByPlan
                            ? 'text-gray-500 opacity-50 hover:bg-white/10 hover:text-white hover:opacity-80'
                            : 'text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}>
                      <Icon size={15} className="flex-shrink-0"/>
                      {!collapsed && <span className="font-medium truncate flex-1">{label}</span>}
                      {!collapsed && isGatedByPlan && !active && <Lock size={11} className="flex-shrink-0 text-gray-500" />}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-2 border-t border-white/10 flex-shrink-0">
            {isSystemAdmin && !collapsed && (
              <Link href="/admin" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-amber-400 hover:bg-amber-500/20 transition text-sm mb-1 font-medium">
                <Shield size={14}/> Admin Panel
              </Link>
            )}
            {!collapsed && (
              <div className="px-2.5 py-1.5 mb-1">
                <p className="text-xs text-gray-500 truncate">{profile?.name || profile?.email || ''}</p>
                <p className="text-xs text-gray-600 capitalize">{profile?.role?.replace('_',' ')}</p>
              </div>
            )}
            <button onClick={handleLogout} title="Logout"
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition text-sm">
              <LogOut size={15} className="flex-shrink-0"/>
              {!collapsed && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
      </div>
    </AuthGuard>
  );
}
