'use client';
import { useState, useEffect } from 'react';
import { reportsAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import AccessDenied from '@/components/AccessDenied';
import { BarChart3, TrendingUp, Package, Users, Wrench, DollarSign, Calendar, GitBranch, Lock } from 'lucide-react';

const MOCK = {
  totalRevenue:87400, monthRevenue:18400, weekRevenue:9800,
  totalJobs:89, monthJobs:14, completedJobs:72, completionRate:81,
  totalCustomers:54, newCustomersMonth:6,
  topProducts:[
    { name:'BlackVue DR900X-2CH',  category:'Dash Cameras',  unitsSold:15, revenue:67500 },
    { name:'Pioneer AVH-Z9200BT',  category:'Audio',         unitsSold:12, revenue:96000 },
    { name:'Tint World Carbon 35%',category:'Tints',         unitsSold:48, revenue:16800 },
    { name:'Viper 5906V Alarm',    category:'Security',      unitsSold:8,  revenue:32000 },
    { name:'Garmin GPS 65s',       category:'GPS',           unitsSold:6,  revenue:51000 },
  ],
  topInstallers:[
    { name:'Alex Cruz',  jobsCompleted:28, revenue:38400, avgJobValue:1371 },
    { name:'Ben Ramos',  jobsCompleted:21, revenue:28600, avgJobValue:1362 },
    { name:'Mario Diaz', jobsCompleted:15, revenue:22400, avgJobValue:1493 },
    { name:'Carlo Santos',jobsCompleted:8, revenue:11200, avgJobValue:1400 },
  ],
  branchSales:[
    { branch:'Main Branch',  revenue:61800, jobs:58, customers:38 },
    { branch:'North Branch', revenue:25600, jobs:31, customers:16 },
  ],
  jobTypes:[
    { type:'Audio Installation',   count:22, revenue:32400 },
    { type:'Window Tinting',       count:18, revenue:14400 },
    { type:'Alarm Installation',   count:14, revenue:21000 },
    { type:'GPS Tracker',          count:11, revenue:18700 },
    { type:'LED Lighting',         count:9,  revenue:8100  },
    { type:'Other',                count:15, revenue:13200 },
  ],
  weeklyRevenue:[
    { week:'Apr W1', revenue:8200 }, { week:'Apr W2', revenue:11400 },
    { week:'Apr W3', revenue:9800 }, { week:'Apr W4', revenue:13200 },
    { week:'May W1', revenue:15800 }, { week:'May W2', revenue:9800 },
  ],
  monthlyRevenue:[
    { month:'Dec', revenue:9200  }, { month:'Jan', revenue:11800 },
    { month:'Feb', revenue:13400 }, { month:'Mar', revenue:15600 },
    { month:'Apr', revenue:18400 }, { month:'May', revenue:9800  },
  ],
  branchComparison: [
    {
      branch: 'Main Branch',
      totalRevenue: 61800,
      totalJobs: 58,
      completedJobs: 48,
      completionRate: 83,
      monthlyRevenue: [
        { month: 'Dec', revenue: 6200 }, { month: 'Jan', revenue: 8400 },
        { month: 'Feb', revenue: 9800 }, { month: 'Mar', revenue: 11200 },
        { month: 'Apr', revenue: 12800 }, { month: 'May', revenue: 13400 }
      ]
    },
    {
      branch: 'North Branch',
      totalRevenue: 25600,
      totalJobs: 31,
      completedJobs: 24,
      completionRate: 77,
      monthlyRevenue: [
        { month: 'Dec', revenue: 3000 }, { month: 'Jan', revenue: 3400 },
        { month: 'Feb', revenue: 3600 }, { month: 'Mar', revenue: 4400 },
        { month: 'Apr', revenue: 5600 }, { month: 'May', revenue: 5600 }
      ]
    }
  ],
  monthlyProfit: [
    { month: 'Dec', revenue: 9200, cogs: 3200, commissions: 1200, netProfit: 4800, margin: 52 },
    { month: 'Jan', revenue: 11800, cogs: 4100, commissions: 1600, netProfit: 6100, margin: 52 },
    { month: 'Feb', revenue: 13400, cogs: 4800, commissions: 1900, netProfit: 6700, margin: 50 },
    { month: 'Mar', revenue: 15600, cogs: 5200, commissions: 2200, netProfit: 8200, margin: 53 },
    { month: 'Apr', revenue: 18400, cogs: 6300, commissions: 2600, netProfit: 9500, margin: 52 },
    { month: 'May', revenue: 19800, cogs: 7100, commissions: 2900, netProfit: 9800, margin: 49 }
  ]
};

function KPI({ label, value, sub, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <div className="text-black"><Icon size={18}/></div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const { profile } = useUser();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [view, setView]     = useState('overview');

  const TAB_LABELS = {
    overview: 'Overview',
    products: 'Products',
    installers: 'Installers',
    branches: 'Branches',
    'multi-branch': 'Multi-Branch Comparison',
    profit: 'Profit Reports'
  };

  const getTabLockMessage = (tabName) => {
    if (tabName === 'products' || tabName === 'branches') {
      return "Upgrade to Growth plan to access this feature";
    }
    if (tabName === 'installers' || tabName === 'multi-branch' || tabName === 'profit') {
      return "Upgrade to Pro plan to access this feature";
    }
    return "";
  };

  const isTabLocked = (tabName) => {
    if (tabName === 'products' || tabName === 'branches') {
      return profile?.plan === 'starter';
    }
    if (tabName === 'installers' || tabName === 'multi-branch' || tabName === 'profit') {
      return profile?.plan === 'starter' || profile?.plan === 'growth';
    }
    return false;
  };

  useEffect(() => {
    reportsAPI.getSalesSummary({ branchId: profile?.branchName || profile?.branchId })
      .then(setStats).catch(()=>setStats(MOCK)).finally(()=>setLoading(false));
  }, [profile?.branchName, profile?.branchId]);

  // RBAC: only super_admin and branch_manager can access Reports
  if (profile && !['super_admin','branch_manager'].includes(profile.role)) {
    return <AccessDenied message="Reports are restricted to Super Admins and Branch Managers." />;
  }

  const s = stats || MOCK;
  const fmt = n => `₱${n>=1000?(n/1000).toFixed(1)+'k':n.toLocaleString()}`;
  const revenueData = period==='weekly' ? s.weeklyRevenue : s.monthlyRevenue;
  const maxRev = Math.max(...(revenueData||[]).map(d=>d.revenue),1);
  const maxProd = Math.max(...(s.topProducts||[]).map(p=>p.revenue),1);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/></div>;

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1 text-sm">Sales & performance analytics</p>
        </div>
        <div className="flex bg-white border border-gray-300 rounded-xl overflow-hidden text-xs w-full sm:w-auto self-start sm:self-auto shadow-sm">
          {['weekly','monthly'].map(p=>(
            <button key={p} onClick={()=>setPeriod(p)} className={`flex-1 sm:flex-none text-center px-4 py-2 font-semibold capitalize transition ${period===p?'bg-orange-500 text-white':'text-gray-600 hover:bg-gray-50'}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none whitespace-nowrap mb-6 pb-1 -mx-4 md:-mx-8 px-4 md:px-8">
        {Object.keys(TAB_LABELS).map(v => {
          const locked = isTabLocked(v);
          const lockMsg = getTabLockMessage(v);
          return (
            <div key={v} className="relative group flex-shrink-0">
              <button
                onClick={() => !locked && setView(v)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 flex-shrink-0 ${
                  locked
                    ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                    : view === v
                      ? 'bg-orange-500 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:border-orange-300'
                }`}
              >
                {TAB_LABELS[v]}
                {locked && <Lock size={12} className="text-gray-400" />}
              </button>
              
              {/* Instant Tooltip */}
              {locked && (
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:flex items-center bg-[#1f2937] border border-white/10 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                  {lockMsg}
                  {/* Triangle Arrow */}
                  <div className="absolute top-full border-4 border-transparent border-t-[#1f2937] left-1/2 -translate-x-1/2" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI label="Total Revenue"    value={fmt(s.totalRevenue)}   sub={`${fmt(s.monthRevenue)} this month`}     icon={DollarSign}/>
        <KPI label="Total Jobs"       value={s.totalJobs}            sub={`${s.monthJobs} this month`}             icon={Wrench}/>
        <KPI label="Completion Rate"  value={`${s.completionRate}%`} sub={`${s.completedJobs}/${s.totalJobs}`}     icon={TrendingUp}/>
        <KPI label="Customers"        value={s.totalCustomers}       sub={`+${s.newCustomersMonth} this month`}    icon={Users}/>
      </div>

      {/* Overview: Revenue chart + Job types */}
      {view==='overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-5 capitalize">{period} Revenue</h2>
            <div className="flex items-end gap-2 h-40">
              {(revenueData||[]).map((d,i)=>(
                <div key={`${period}-${d.week||d.month}-${i}`} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[9px] sm:text-xs text-gray-400">{d.revenue>0?fmt(d.revenue):''}</span>
                  <div className="w-full bg-orange-500 rounded-t-md" style={{height:`${Math.max(4,(d.revenue/maxRev)*140)}px`,opacity:0.5+0.5*(d.revenue/maxRev)}}/>
                  <span className="text-[9px] sm:text-xs text-gray-400">{d.week||d.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-5">By Job Type</h2>
            <div className="space-y-3">
              {(s.jobTypes||[]).map(jt=>(
                <div key={jt.type}>
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="text-gray-700 truncate mr-2">{jt.type}</span>
                    <span className="text-gray-500 flex-shrink-0">{jt.count} · {fmt(jt.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-orange-500 h-1.5 rounded-full" style={{width:`${(jt.count/s.totalJobs)*100}%`}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      {view==='products' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200"><p className="text-sm font-semibold text-gray-900">Top Selling Products</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead><tr className="bg-gray-50 border-b border-gray-200">{['Rank','Product','Category','Units Sold','Revenue','Share'].map(h=><th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {(s.topProducts||[]).map((p,i)=>(
                  <tr key={p.name} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${i===0?'bg-amber-100 text-amber-700':i===1?'bg-gray-200 text-gray-600':i===2?'bg-orange-100 text-orange-600':'bg-gray-100 text-gray-500'}`}>{i+1}</div>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{p.category}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{p.unitsSold}</td>
                    <td className="px-5 py-3 text-sm font-bold text-emerald-700">{fmt(p.revenue)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-24"><div className="bg-orange-500 h-1.5 rounded-full" style={{width:`${(p.revenue/maxProd)*100}%`}}/></div>
                        <span className="text-xs text-gray-500">{Math.round((p.revenue/s.totalRevenue)*100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Installers */}
      {view==='installers' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200"><p className="text-sm font-semibold text-gray-900">Installer Performance</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead><tr className="bg-gray-50 border-b border-gray-200">{['Installer','Jobs Done','Revenue Generated','Avg Job Value','Share'].map(h=><th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {(s.topInstallers||[]).map((inst,i)=>{
                  const maxJobs = Math.max(...s.topInstallers.map(t=>t.jobsCompleted));
                  return (
                    <tr key={inst.name} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">{inst.name.charAt(0)}</div>
                          <span className="text-sm font-semibold text-gray-900">{inst.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm font-bold text-gray-900">{inst.jobsCompleted}</td>
                      <td className="px-5 py-3 text-sm font-bold text-emerald-700">{fmt(inst.revenue)}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">₱{inst.avgJobValue.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 w-28"><div className="bg-orange-500 h-2 rounded-full" style={{width:`${(inst.jobsCompleted/maxJobs)*100}%`}}/></div>
                          <span className="text-xs text-gray-500">{Math.round((inst.jobsCompleted/s.totalJobs)*100)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Branches */}
      {view==='branches' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {(s.branchSales||[]).map(b=>(
            <div key={b.branch} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-orange-100 p-2 rounded-lg"><GitBranch size={18} className="text-orange-600"/></div>
                <h3 className="font-semibold text-gray-900">{b.branch}</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[{l:'Revenue',v:fmt(b.revenue)},{l:'Jobs',v:b.jobs},{l:'Customers',v:b.customers}].map(item=>(
                  <div key={item.l} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">{item.l}</p>
                    <p className="text-lg font-bold text-gray-900">{item.v}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Multi-Branch Comparison */}
      {view==='multi-branch' && (
        <div className="space-y-6">
          {/* Branch summary cards side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(s.branchComparison||[]).map(bc => (
              <div key={bc.branch} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-orange-100 p-2.5 rounded-xl text-orange-600"><GitBranch size={20} /></div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{bc.branch}</h3>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase mt-0.5">Location Performance</p>
                  </div>
                </div>
                
                <div className="space-y-3.5 mt-2">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                    <span className="text-xs text-gray-500 font-medium">Total Revenue</span>
                    <span className="text-sm font-extrabold text-emerald-600">{fmt(bc.totalRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                    <span className="text-xs text-gray-500 font-medium">Jobs Completed</span>
                    <span className="text-xs font-bold text-gray-800">{bc.completedJobs} / {bc.totalJobs}</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-xs text-gray-500 font-medium">Job Completion Rate</span>
                      <span className="text-xs font-bold text-orange-600">{bc.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-150 h-2 rounded-full overflow-hidden">
                      <div className="bg-orange-500 h-full rounded-full transition-all" style={{ width: `${bc.completionRate}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Historical comparison bar charts by month */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-5">Location Sales Comparison (Last 6 Months)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(s.branchComparison?.[0]?.monthlyRevenue||[]).map((_, idx) => {
                const monthLabel = s.branchComparison[0]?.monthlyRevenue[idx].month;
                // Find maximum branch revenue in this month to scale the bars
                const monthRevs = (s.branchComparison||[]).map(b => b.monthlyRevenue[idx]?.revenue || 0);
                const maxMonthRev = Math.max(...monthRevs, 1);
                
                return (
                  <div key={idx} className="bg-gray-50 rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200/50 pb-1.5">{monthLabel} Revenue</h4>
                      <div className="space-y-4">
                        {(s.branchComparison||[]).map(b => {
                          const monthRev = b.monthlyRevenue[idx]?.revenue || 0;
                          const sharePct = maxMonthRev > 0 ? (monthRev / maxMonthRev) * 100 : 0;
                          return (
                            <div key={b.branch} className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-gray-700">{b.branch}</span>
                                <span className="font-bold text-gray-900">{fmt(monthRev)}</span>
                              </div>
                              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                                <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${sharePct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Profit Reports */}
      {view==='profit' && (() => {
        const currentMonthProfit = s.monthlyProfit?.[s.monthlyProfit.length - 1] || { revenue: 0, cogs: 0, commissions: 0, netProfit: 0, margin: 0 };
        const maxVal = Math.max(...(s.monthlyProfit||[]).map(p => Math.max(p.revenue, p.netProfit, 1)), 1);

        return (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KPI label="Month Net Profit" value={fmt(currentMonthProfit.netProfit)} sub={`Of ${fmt(currentMonthProfit.revenue)} revenue`} icon={DollarSign} />
              <KPI label="Month Product Cost" value={fmt(currentMonthProfit.cogs)} sub="Cost of Goods Sold (COGS)" icon={Package} />
              <KPI label="Month Commissions" value={fmt(currentMonthProfit.commissions)} sub="Installer labor payouts" icon={Users} />
              <KPI label="Profit Margin" value={`${currentMonthProfit.margin}%`} sub="Net income ratio" icon={TrendingUp} />
            </div>

            {/* Visual Profit Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-gray-900">Revenue vs. Net Profit (Last 6 Months)</h3>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-orange-400 rounded-sm" /><span>Gross Revenue</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-sm" /><span>Net Profit</span></div>
                </div>
              </div>
              
              <div className="flex items-end gap-4 h-48 justify-around pt-6 px-4">
                {(s.monthlyProfit||[]).map((p, i) => {
                  const revHeight = (p.revenue / maxVal) * 140;
                  const profitHeight = (p.netProfit / maxVal) * 140;
                  return (
                    <div key={p.month} className="flex-1 flex flex-col items-center gap-2 max-w-[80px]">
                      <div className="flex items-end gap-1.5 h-36 w-full justify-center">
                        {/* Gross Revenue Column */}
                        <div className="group relative flex flex-col items-center flex-1">
                          <span className="absolute bottom-full mb-1 text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition whitespace-nowrap bg-gray-900 text-white px-1.5 py-0.5 rounded shadow z-10">{fmt(p.revenue)}</span>
                          <div className="w-4 bg-orange-400 rounded-t-sm" style={{ height: `${Math.max(4, revHeight)}px` }} />
                        </div>
                        {/* Net Profit Column */}
                        <div className="group relative flex flex-col items-center flex-1">
                          <span className="absolute bottom-full mb-1 text-[10px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition whitespace-nowrap bg-gray-900 text-white px-1.5 py-0.5 rounded shadow z-10">{fmt(p.netProfit)}</span>
                          <div className="w-4 bg-emerald-500 rounded-t-sm" style={{ height: `${Math.max(4, profitHeight)}px` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gray-500 uppercase">{p.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table Details */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200"><p className="text-sm font-semibold text-gray-900">Historical Financial Performance</p></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Month','Gross Revenue','Product COGS','Installer Commissions','Net Profit','Margin'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(s.monthlyProfit||[]).map(p => (
                      <tr key={p.month} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3.5 text-sm font-bold text-gray-900">{p.month}</td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-gray-800">{fmt(p.revenue)}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{fmt(p.cogs)}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{fmt(p.commissions)}</td>
                        <td className="px-5 py-3.5 text-sm font-bold text-emerald-700">{fmt(p.netProfit)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.margin >= 50 ? 'bg-emerald-100 text-emerald-700' : p.margin >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{p.margin}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
