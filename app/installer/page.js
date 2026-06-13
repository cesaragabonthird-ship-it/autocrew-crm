'use client';
import { useState } from 'react';
import { useUser } from '@/lib/UserContext';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Link from 'next/link';
import { ClipboardList, CheckCircle2, Clock, Car, Wrench, MapPin, Phone, ChevronRight, Calendar, Package, Search, X, Check } from 'lucide-react';

const STATUS_CONFIG = {
  assigned:   { label:'Assigned',    bg:'bg-white', border:'border-gray-200', badge:'bg-blue-50 text-blue-700 border border-blue-100',   dot:'bg-blue-500'    },
  in_progress:{ label:'In Progress', bg:'bg-white', border:'border-gray-200', badge:'bg-amber-50 text-amber-700 border border-amber-100', dot:'bg-amber-500'   },
  completed:  { label:'Completed',   bg:'bg-white', border:'border-gray-200', badge:'bg-emerald-50 text-emerald-700 border border-emerald-100',dot:'bg-emerald-600'},
  pending:    { label:'Pending',     bg:'bg-white', border:'border-gray-200', badge:'bg-gray-50 text-gray-700 border border-gray-100',   dot:'bg-gray-500'    },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

export default function InstallerHome() {
  const { profile } = useUser();
  const [filter, setFilter] = useState('active');
  const [completedSearch, setCompletedSearch] = useState('');
  const [completedPage, setCompletedPage] = useState(1);

  const tenantId = profile?.tenantId || (typeof window !== "undefined" ? localStorage.getItem("autocrew_tenantId") : null);
  const liveJobs = useQuery(api.jobs.getByInstaller, profile?.uid && tenantId ? {
    tenantId,
    assignedClerkId: profile.uid,
  } : 'skip');

  const rawJobs = liveJobs || [];
  const jobs = rawJobs.map(j => ({ ...j, id: String(j._id) }));
  const loading = profile?.uid ? (liveJobs === undefined) : false;

  const todayJobs     = jobs.filter(j=>j.scheduledDate===new Date().toISOString().slice(0,10)||j.status==='in_progress');
  const activeJobs    = jobs.filter(j=>['assigned','in_progress'].includes(j.status));
  const rawCompletedJobs = jobs.filter(j=>j.status==='completed');
  
  // Search completed jobs
  const filteredCompletedJobs = rawCompletedJobs.filter(j => {
    if (!completedSearch) return true;
    const query = completedSearch.toLowerCase().trim();
    return (
      j.jobNumber?.toLowerCase().includes(query) ||
      j.customer?.toLowerCase().includes(query) ||
      j.vehicle?.toLowerCase().includes(query) ||
      j.vehiclePlate?.toLowerCase().includes(query) ||
      j.type?.toLowerCase().includes(query) ||
      j.notes?.toLowerCase().includes(query)
    );
  });

  // Paginated completed jobs
  const completedLimit = 10;
  const totalCompletedPages = Math.ceil(filteredCompletedJobs.length / completedLimit) || 1;
  const startIndex = (completedPage - 1) * completedLimit;
  const paginatedCompletedJobs = filteredCompletedJobs.slice(startIndex, startIndex + completedLimit);

  const displayed     = filter==='active' ? activeJobs : filter==='today' ? todayJobs : paginatedCompletedJobs;

  const greeting = () => { const h=new Date().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening'; };

  const handleFilterChange = (f) => {
    setFilter(f);
    setCompletedPage(1);
    setCompletedSearch('');
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/></div>;

  return (
    <div className="px-4 py-6">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{greeting()}, {profile?.name?.split(' ')[0] || 'Installer'} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{new Date().toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'})}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label:'Active',    count:activeJobs.length },
          { label:'Today',     count:todayJobs.length  },
          { label:'Done',      count:rawCompletedJobs.length },
        ].map(s=>(
          <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{s.count}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          {k:'active',l:'Active'},
          {k:'today',l:'Today'},
          {k:'completed',l:'Completed'}
        ].map(t=>(
          <button key={t.k} onClick={()=>handleFilterChange(t.k)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition ${filter===t.k?'bg-orange-500 text-white shadow-sm':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Search field (Only for Completed jobs) */}
      {filter === 'completed' && (
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3.5 top-3 text-gray-400"/>
          <input
            type="text"
            value={completedSearch}
            onChange={e => { setCompletedSearch(e.target.value); setCompletedPage(1); }}
            placeholder="Search completed jobs..."
            className="w-full pl-9 pr-8 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
          />
          {completedSearch && (
            <button onClick={() => { setCompletedSearch(''); setCompletedPage(1); }} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
              <X size={14}/>
            </button>
          )}
        </div>
      )}

      {/* Job cards */}
      <div className="space-y-3">
        {displayed.length===0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl py-12 text-center">
            <ClipboardList size={36} className="mx-auto text-gray-400 mb-3"/>
            <p className="text-gray-500 text-sm">No {filter} jobs {completedSearch ? 'matching query' : ''}</p>
          </div>
        ) : displayed.map(job => {
          const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
          return (
            <Link key={job.id} href={`/installer/jobs/${job.id}`} className="block">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm hover:border-gray-300 transition duration-200 cursor-pointer">
                {/* Row 1: Customer Name (left), status badge (middle/right), chevron (right) */}
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-lg font-bold text-gray-900 leading-tight">{job.customer}</p>
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.badge}`}>
                      {job.status === 'completed' && <Check size={12} className="stroke-[3.5px]" />}
                      {sc.label}
                    </span>
                    <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
                  </div>
                </div>

                {/* Row 2: Job Order Number */}
                <p className="text-sm font-semibold text-gray-400 font-mono mb-4">{job.jobNumber}</p>

                {/* Content Rows */}
                <div className="space-y-2.5">
                  {/* Row 3: Phone */}
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 h-5">
                    <Phone size={15} className="text-gray-400 flex-shrink-0" />
                    <span>{job.phone || ''}</span>
                  </div>

                  {/* Row 4: Vehicle */}
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 h-5">
                    <Car size={15} className="text-gray-400 flex-shrink-0" />
                    <span>{job.vehicle || ''}{job.vehiclePlate ? ` (${job.vehiclePlate})` : ''}</span>
                  </div>

                  {/* Row 5: Job Type */}
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 h-5">
                    <Wrench size={15} className="text-gray-400 flex-shrink-0" />
                    <span>{job.type || ''}</span>
                  </div>

                  {/* Row 6: Scheduled Date & Parts */}
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 h-5">
                    <Calendar size={15} className="text-gray-400 flex-shrink-0" />
                    <div className="flex items-center flex-wrap gap-x-1.5">
                      <span>{formatDate(job.scheduledDate)}</span>
                      <span className="text-gray-300">•</span>
                      <Package size={15} className="text-gray-400 flex-shrink-0" />
                      <span>{job.parts && job.parts.length > 0 ? job.parts.map(p => `${p.name} ×${p.qty}`).join(', ') : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination controls for Completed Tab */}
      {filter === 'completed' && filteredCompletedJobs.length > completedLimit && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <button
            disabled={completedPage === 1}
            onClick={() => setCompletedPage(p => Math.max(1, p - 1))}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 text-xs font-semibold rounded-xl transition"
          >
            ← Previous
          </button>
          <span className="text-xs font-medium text-gray-500">
            Page {completedPage} of {totalCompletedPages}
          </span>
          <button
            disabled={completedPage === totalCompletedPages}
            onClick={() => setCompletedPage(p => Math.min(totalCompletedPages, p + 1))}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 text-xs font-semibold rounded-xl transition"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
