'use client';
import { useState } from 'react';
import { jobsAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ArrowLeft, Car, Wrench, MapPin, Phone, Calendar, Package, CheckCircle2, Clock, AlertCircle, Camera, MessageSquare, Check } from 'lucide-react';

const STATUS_BAR = {
  assigned:   { color:'bg-blue-500',    label:'Assigned'    },
  in_progress:{ color:'bg-amber-500',   label:'In Progress' },
  completed:  { color:'bg-emerald-500', label:'Completed'   },
};

const DEFAULT_CHECKLIST = [
  { id: 'c1', label: 'Inspect vehicle — document pre-existing damage', done: false },
  { id: 'c2', label: 'Disconnect battery before starting work', done: false },
  { id: 'c3', label: 'Prepare tools and parts needed for installation', done: false },
  { id: 'c4', label: 'Perform core installation of parts & wiring', done: false },
  { id: 'c5', label: 'Test operation, connections, and basic functionality', done: false },
  { id: 'c6', label: 'Clean up work area and return vehicle to original condition', done: false }
];

export default function InstallerJobDetail() {
  const router      = useRouter();
  const params      = useParams();
  const id          = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { profile } = useUser();
  const [saving, setSaving]   = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [showComplete, setShowComplete]     = useState(false);
  const [tab, setTab]         = useState('details');

  const rawJob = useQuery(api.jobs.getById, id ? { id } : 'skip');
  const job = rawJob ? { ...rawJob, id: String(rawJob._id) } : null;
  const loading = id ? (rawJob === undefined) : false;

  const updateChecklistMutation = useMutation(api.jobs.updateChecklist);
  const updateJobMutation = useMutation(api.jobs.update);

  const updateStatus = async (newStatus) => {
    setSaving(true);
    try {
      await jobsAPI.updateStatus(id, newStatus, completionNote);
      if (newStatus === 'completed') {
        setShowComplete(false);
        router.push('/installer');
      }
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCheck = async (cid) => {
    if (!job || job.status === 'completed') return;
    const currentChecklist = job.checklist && job.checklist.length > 0 ? job.checklist : DEFAULT_CHECKLIST;
    const updatedChecklist = currentChecklist.map(c => c.id === cid ? { ...c, done: !c.done } : c);
    try {
      await updateChecklistMutation({ id: job._id, checklist: updatedChecklist });
    } catch (err) {
      console.error('Failed to update checklist:', err);
    }
  };

  const togglePart = async (idx) => {
    if (!job || job.status === 'completed') return;
    const updatedParts = (job.parts || []).map((p, i) => i === idx ? { ...p, checked: !p.checked } : p);
    try {
      const cleanParts = updatedParts.map(p => ({
        name: p.name,
        qty: p.qty,
        price: p.price,
        sku: p.sku || undefined,
        checked: p.checked || false,
      }));
      await updateJobMutation({
        id: job._id,
        parts: cleanParts,
        jobNumber: job.jobNumber,
        customer: job.customer,
        type: job.type,
        status: job.status,
        branch: job.branch,
        labor: job.labor,
        amount: job.amount,
      });
    } catch (err) {
      console.error('Failed to update parts checklist:', err);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/></div>;
  if (!job)    return <div className="px-4 py-10 text-center"><p className="text-gray-500">Job not found</p><button onClick={() => router.back()} className="mt-3 text-orange-400 text-sm">Go back</button></div>;

  const checklist = job.checklist && job.checklist.length > 0 ? job.checklist : DEFAULT_CHECKLIST;
  const doneCount   = checklist.filter(c => c.done).length || 0;
  const totalCount  = checklist.length || 0;
  const pct         = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const partsDone   = (job.parts || []).filter(p => p.checked).length;
  const sb          = STATUS_BAR[job.status] || STATUS_BAR.assigned;

  const canConfirm = doneCount === totalCount && partsDone === (job.parts?.length || 0);

  return (
    <div className={`min-h-screen ${showComplete ? 'pb-[340px]' : 'pb-40'} bg-gray-50 text-gray-800`}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-200/50 rounded-lg text-gray-500 hover:text-gray-900 transition">
            <ArrowLeft size={20}/>
          </button>
          <span className="text-lg font-bold text-gray-400 font-mono">{job.jobNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${sb.color}`} />
          <span className="text-sm font-semibold text-gray-900">{sb.label}</span>
        </div>
      </div>

      {/* Vehicle */}
      <div className="mx-4 mb-4 bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gray-100 p-2 rounded-xl"><Car size={20} className="text-gray-500"/></div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">{job.vehicle}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {[
                job.vehicleColor && job.vehicleColor !== 'N/A Color' && job.vehicleColor !== 'N/A' ? job.vehicleColor : null,
                job.vehiclePlate || 'No Plate'
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 text-xs text-gray-500 mt-2.5 pt-2.5 border-t border-gray-100">
          <span className="flex items-center gap-1"><Wrench size={11} className="text-gray-400"/>{job.type}</span>
          {job.scheduledDate && <span className="flex items-center gap-1"><Calendar size={11}/>{job.scheduledDate} {job.startTime ? `${job.startTime}–${job.endTime}` : ''}</span>}
          {job.address && <span className="flex items-center gap-1"><MapPin size={11}/>{job.address}</span>}
        </div>
      </div>

      {/* Customer */}
      <div className="mx-4 mb-4 flex gap-2">
        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-0.5">Customer</p>
          <p className="text-sm font-semibold text-gray-900">{job.customer}{job.phone ? ` • ${job.phone}` : ''}</p>
        </div>
        <a href={`tel:${job.phone}`} className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 rounded-xl text-sm font-medium transition">
          <Phone size={16}/> Call
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 mb-4">
        {[
          {k:'details',l:'Details'},
          {k:'checklist',l:`Checklist (${doneCount}/${totalCount})`},
          {k:'parts',l:`Parts (${partsDone}/${job.parts?.length||0})`}
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${tab===t.k?'bg-orange-500 text-white shadow-sm':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Details tab */}
      {tab === 'details' && (
        <div className="px-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2 flex items-center gap-1">
              <AlertCircle size={12} className="text-gray-400"/>Notes
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{job.notes || 'No notes provided.'}</p>
          </div>
        </div>
      )}

      {/* Checklist tab */}
      {tab === 'checklist' && (
        <div className="px-4 space-y-2">
          <p className="text-xs text-gray-400 mb-3">Tap each step to mark as done</p>
          {checklist.map(item => (
            <button key={item.id} onClick={() => toggleCheck(item.id)} disabled={job.status === 'completed'}
              className={`w-full flex items-start gap-3 p-4 rounded-2xl border transition text-left ${item.done ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/30' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'} disabled:cursor-not-allowed`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition ${item.done ? 'bg-emerald-500' : 'border-2 border-gray-300'}`}>
                {item.done && <Check size={13} className="text-white"/>}
              </div>
              <p className={`text-sm leading-relaxed ${item.done ? 'text-emerald-700 line-through opacity-70' : 'text-gray-700'}`}>{item.label}</p>
            </button>
          ))}
          {doneCount === totalCount && totalCount > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center mt-4">
              <CheckCircle2 size={28} className="mx-auto text-emerald-500 mb-2"/>
              <p className="text-emerald-800 font-semibold text-sm">All steps complete!</p>
              <p className="text-emerald-600/70 text-xs mt-0.5">Ready to mark job as done below</p>
            </div>
          )}
        </div>
      )}

      {/* Parts tab */}
      {tab === 'parts' && (
        <div className="px-4 space-y-2">
          <p className="text-xs text-gray-400 mb-3">Confirm each part is ready and installed</p>
          {(job.parts||[]).map((part, i) => (
            <button key={i} onClick={() => togglePart(i)} disabled={job.status === 'completed'}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition ${part.checked ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100/30 text-emerald-800' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'} disabled:cursor-not-allowed`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 transition ${part.checked ? 'bg-emerald-500' : 'border-2 border-gray-300'}`}>
                {part.checked && <Check size={13} className="text-white"/>}
              </div>
              <div className="flex-1 text-left">
                <p className={`text-sm font-medium ${part.checked ? 'text-emerald-700' : 'text-gray-900'}`}>{part.name}</p>
                <p className="text-xs text-gray-500">SKU: {part.sku || 'N/A'} · Qty: {part.qty}</p>
              </div>
              <Package size={15} className={part.checked ? 'text-emerald-500' : 'text-gray-400'}/>
            </button>
          ))}
        </div>
      )}

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-200 px-4 py-4 z-10">
        {job.status === 'assigned' && (
          <button onClick={() => updateStatus('in_progress')} disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition text-base disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
            {saving ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Clock size={20}/>}
            Start Job
          </button>
        )}
        {job.status === 'in_progress' && !showComplete && (
          <button onClick={() => setShowComplete(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition text-base flex items-center justify-center gap-2 shadow-sm">
            <CheckCircle2 size={20}/> Mark as Complete
          </button>
        )}
        {job.status === 'in_progress' && showComplete && (
          <div className="space-y-3">
            {!canConfirm && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0 text-red-500"/>
                <span>Cannot complete: Please check off all items in both the Checklist and Parts tabs first.</span>
              </p>
            )}
            <textarea value={completionNote} onChange={e => setCompletionNote(e.target.value)} rows={2}
              placeholder="Completion notes — e.g. tested and working, customer satisfied…"
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"/>
            <div className="flex gap-2">
              <button onClick={() => setShowComplete(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3.5 rounded-2xl transition text-sm">Cancel</button>
              <button onClick={() => updateStatus('completed')} disabled={saving || !canConfirm}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl transition text-sm disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm">
                {saving ? <div className="h-4 w-4 border-2 border-emerald-300 border-t-white rounded-full animate-spin"/> : <CheckCircle2 size={17}/>}
                Confirm Complete
              </button>
            </div>
          </div>
        )}
        {job.status === 'completed' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1"/>
            <p className="text-emerald-800 font-semibold text-sm">Job Completed ✓</p>
          </div>
        )}
      </div>
    </div>
  );
}
