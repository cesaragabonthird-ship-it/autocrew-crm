'use client';
import { useState, useEffect } from 'react';
import { statsAPI, jobsAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import {
  Package, ClipboardList, DollarSign, TrendingUp,
  AlertTriangle, Clock, CheckCircle2, Truck,
  Users, ShoppingCart, ArrowUpRight, Wrench,
  Rocket, MessageSquare, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

const MOCK = {
  todayJobs:6, pendingJobs:4, inProgressJobs:2, completedToday:3,
  totalRevenue:48200, monthRevenue:12800, pendingPayments:8400,
  totalProducts:142, lowStockItems:7, totalCustomers:89,
  pendingDeliveries:3, weeklyJobsData:[
    {day:'Mon',jobs:4,revenue:6200},{day:'Tue',jobs:6,revenue:8400},
    {day:'Wed',jobs:3,revenue:4100},{day:'Thu',jobs:7,revenue:9800},
    {day:'Fri',jobs:8,revenue:11200},{day:'Sat',jobs:5,revenue:7100},{day:'Sun',jobs:2,revenue:2800},
  ],
  recentJobs:[
    {id:'j1',customer:'Carlos Reyes',   vehicle:'Toyota Hilux 2022',   type:'Audio Installation',   status:'in_progress',installer:'Alex Cruz',   amount:8500 },
    {id:'j2',customer:'Maria Santos',   vehicle:'Honda City 2021',     type:'Window Tinting',       status:'assigned',   installer:'Ben Ramos',   amount:4500 },
    {id:'j3',customer:'Juan Dela Cruz', vehicle:'Ford Ranger 2023',    type:'Alarm Installation',   status:'pending',    installer:'',            amount:6200 },
    {id:'j4',customer:'Ana Garcia',     vehicle:'Mitsubishi Strada 2020',type:'LED Lighting',       status:'completed',  installer:'Alex Cruz',   amount:3800 },
  ],
  topProducts:[
    {name:'Pioneer AVH-Z9200BT',    category:'Audio',    sold:12,revenue:96000},
    {name:'Viper 5906V Alarm',      category:'Security', sold:8, revenue:32000},
    {name:'BlackVue DR900X-2CH',    category:'Dash Cam', sold:15,revenue:67500},
    {name:'Tint World Carbon 35%',  category:'Tints',    sold:22,revenue:44000},
  ],
};

function StatCard({ label, value, sub, icon: Icon, href, alert }) {
  const inner = (
    <div className={`bg-white rounded-xl border p-4 sm:p-5 h-full transition ${href?'hover:shadow-md hover:border-orange-200 cursor-pointer':''} ${alert?'border-red-200':'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">{label}</p>
        <div className="text-gray-400 sm:text-black flex-shrink-0"><Icon size={16}/></div>
      </div>
      <p className="text-xl sm:text-3xl font-bold text-gray-900 mb-0.5">{value}</p>
      {sub && <p className={`text-[10px] sm:text-xs truncate ${alert?'text-red-500 font-medium':'text-gray-400'}`}>{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

const STATUS_CLS = {
  pending:    'bg-gray-100 text-gray-600',
  assigned:   'bg-blue-100 text-blue-700',
  in_progress:'bg-amber-100 text-amber-700',
  completed:  'bg-emerald-100 text-emerald-700',
};

export default function DashboardHome() {
  const { profile } = useUser();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.tenantId) return;
    setLoading(true);

    // Safety-net timeout: if APIs haven't responded in 10s, show mock data
    const timeout = setTimeout(() => {
      setStats(prev => prev || MOCK);
      setLoading(false);
    }, 10000);

    const loadDashboard = async () => {
      // Run customer backfill only once per session
      const backfillKey = `autocrew_backfill_${profile.tenantId}`;
      if (typeof window !== 'undefined' && !sessionStorage.getItem(backfillKey)) {
        try {
          await jobsAPI.backfill();
          sessionStorage.setItem(backfillKey, '1');
        } catch (err) {
          console.error("Backfill failed:", err);
        }
      }

      try {
        const data = await statsAPI.getDashboard(profile?.branchName || profile?.branchId);
        setStats(data);
      } catch {
        setStats(MOCK);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    loadDashboard();

    return () => clearTimeout(timeout);
  }, [profile?.tenantId, profile?.branchName, profile?.branchId]);

  const s   = stats || MOCK;
  const fmt = n => n >= 1000 ? `₱${(n/1000).toFixed(1)}k` : `₱${n}`;
  const maxRev = Math.max(...(s.weeklyJobsData||[]).map(d=>d.revenue),1);

  const greeting = () => {
    const h = new Date().getHours();
    return h<12?'Good morning':h<18?'Good afternoon':'Good evening';
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span>{greeting()}{profile?.name?`, ${profile.name.split(' ')[0]}`:''}</span>
            <span className="inline-block hover:animate-bounce select-none">👋</span>
          </h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm">
            {profile?.branchName || 'All Branches'} · {new Date().toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'})}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link href="/dashboard/invoices?new=shop" className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm font-medium text-sky-700 hover:bg-sky-100 transition shadow-sm">
            <ShoppingCart size={15}/> Walk-in Sale
          </Link>
          <Link href="/dashboard/invoices" className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-3 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition shadow-sm">
            <DollarSign size={15}/> Invoices
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/></div>
      ) : (
        <>
          {/* Alert row */}
          {s.lowStockItems > 0 && (
            <Link href="/dashboard/inventory?filter=low_stock">
              <div className="flex items-center gap-3 bg-red-50 border border-red-200/60 rounded-xl px-4 py-3 mb-6 hover:bg-red-100 transition shadow-sm">
                <AlertTriangle size={17} className="text-red-500 flex-shrink-0"/>
                <p className="text-xs sm:text-sm font-medium text-red-700">
                  {s.lowStockItems} product{s.lowStockItems!==1?'s':''} are running low on stock
                </p>
                <span className="ml-auto text-xs text-red-500 font-semibold flex-shrink-0">View →</span>
              </div>
            </Link>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Today's Jobs"       value={s.todayJobs}          sub={`${s.completedToday} completed`}    icon={ClipboardList} href="/dashboard/job-orders"/>
            <StatCard label="Month Revenue"      value={fmt(s.monthRevenue)}  sub={`${fmt(s.pendingPayments)} pending`} icon={DollarSign}    href="/dashboard/payments"/>
            <StatCard label="Low Stock"          value={s.lowStockItems}      sub="items need restocking"               icon={Package}       href="/dashboard/inventory?filter=low_stock" alert={s.lowStockItems>0}/>
            <StatCard label="Pending Deliveries" value={s.pendingDeliveries}  sub="awaiting arrival"                    icon={Truck}         href="/dashboard/deliveries"/>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            {/* Weekly revenue bar chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-gray-900">This Week's Revenue</h2>
                <span className="text-xs text-gray-400">{fmt(s.weeklyJobsData?.reduce((a,d)=>a+d.revenue,0)||0)} total</span>
              </div>
              <div className="flex items-end gap-1.5 sm:gap-2 h-36">
                {(s.weeklyJobsData||[]).map((d,i) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] sm:text-xs text-gray-400 truncate">{d.revenue>0?fmt(d.revenue):''}</span>
                    <div className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-md transition-all duration-300"
                      style={{height:`${Math.max(4,(d.revenue/maxRev)*120)}px`,opacity:0.75+0.25*(d.revenue/maxRev)}}/>
                    <span className="text-[10px] sm:text-xs text-gray-400">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Job status breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-5">Job Status</h2>
              <div className="space-y-4">
                {[
                  {label:'Completed', count:s.completedToday, bar:'bg-emerald-500', icon:CheckCircle2, cls:'text-emerald-500'},
                  {label:'In Progress',count:s.inProgressJobs,bar:'bg-amber-500',  icon:Clock,        cls:'text-amber-500' },
                  {label:'Pending',   count:s.pendingJobs,    bar:'bg-gray-400',    icon:ClipboardList,cls:'text-gray-500'  },
                ].map(row => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <row.icon size={13} className={row.cls}/>{row.label}
                      </div>
                      <span className="text-xs font-bold text-gray-900">{row.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`${row.bar} h-1.5 rounded-full`}
                        style={{width:`${Math.max(4,(row.count/Math.max(s.todayJobs,1))*100)}%`}}/>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                {[
                  {label:'Total Customers', value:s.totalCustomers, icon:Users},
                  {label:'Products in Stock',value:s.totalProducts, icon:Package},
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-500"><item.icon size={13}/>{item.label}</div>
                    <span className="font-bold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent jobs + Top products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Recent jobs */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-900">Recent Jobs</p>
                <Link href="/dashboard/job-orders" className="text-xs text-orange-500 font-medium hover:underline">View all →</Link>
              </div>
              <div className="divide-y divide-gray-100">
                {(s.recentJobs||[]).map(job => (
                  <div key={job.id} className="flex items-center gap-2.5 px-4 sm:px-5 py-3 hover:bg-gray-50 transition">
                    <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {job.customer.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{job.customer}</p>
                      <p className="text-xs text-gray-500 truncate">{job.vehicle} · {job.type}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CLS[job.status]||STATUS_CLS.pending}`}>
                        {job.status.replace('_',' ')}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">₱{job.amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top products */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden relative shadow-sm">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-900">Top Selling Products</p>
                {profile?.plan !== 'starter' && (
                  <Link href="/dashboard/reports" className="text-xs text-orange-500 font-medium hover:underline">View report →</Link>
                )}
              </div>
              <div className={`divide-y divide-gray-100 ${profile?.plan === 'starter' ? 'blur-[6px] select-none pointer-events-none' : ''}`}>
                {(s.topProducts||[]).map((prod,i) => (
                  <div key={prod.name} className="flex items-center gap-2.5 px-4 sm:px-5 py-3">
                    <div className="h-7 w-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i+1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{prod.name}</p>
                      <p className="text-xs text-gray-500">{prod.category} · {prod.sold} sold</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 flex-shrink-0">₱{(prod.revenue/1000).toFixed(1)}k</p>
                  </div>
                ))}
              </div>
              {/* Upgrade overlay for starter plan */}
              {profile?.plan === 'starter' && (
                <div className="absolute inset-0 top-[53px] flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px] z-10">
                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-6 py-5 text-center max-w-[220px]">
                    <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <TrendingUp size={18} className="text-orange-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Upgrade to View</p>
                    <p className="text-xs text-gray-500 mb-3">Upgrade your plan to access detailed product insights & reports.</p>
                    <Link href="/dashboard/billing" className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition">
                      <ArrowUpRight size={13} /> Upgrade Plan
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Feature Roadmap Widget (Growth & Pro only) */}
          {profile && ['growth', 'pro'].includes(profile.plan) && (
            <div className="mt-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/60 rounded-xl p-4 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white flex-shrink-0">
                  <Rocket size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Upcoming Platform Updates</h3>
                  <p className="text-[10px] text-orange-600 font-semibold uppercase tracking-wider mt-0.5">Exclusive Preview for Growth & Pro plans</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/80 backdrop-blur-[1px] border border-orange-100 rounded-xl p-4 flex gap-3 shadow-sm">
                  <div className="h-9 w-9 rounded-lg bg-orange-100/50 flex items-center justify-center flex-shrink-0 text-orange-600">
                    <MessageSquare size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800">SMS Notifications & Reminders</p>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">Automatically notify customers via text messages when their accessory installation is marked complete, reducing pick-up delays.</p>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-[1px] border border-orange-100 rounded-xl p-4 flex gap-3 shadow-sm">
                  <div className="h-9 w-9 rounded-lg bg-orange-100/50 flex items-center justify-center flex-shrink-0 text-orange-600">
                    <RefreshCw size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800">Inventory Auto-Reordering</p>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">Automatically drafts a Purchase Order for your suppliers when product stock drops below critical safety levels, ensuring you never run out of popular items.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
