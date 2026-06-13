'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { teamAPI, branchesAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import { ROLES, ROLE_LABELS } from '@/lib/constants';
import AccessDenied from '@/components/AccessDenied';
import { Plus, Search, X, Users, Edit2, Trash2, Phone, Mail, UserCheck, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

const MOCK = [
  { id:'tm1', name:'Alex Cruz',     email:'alex@shop.com',  phone:'09171111111', role:'installer',      branch:'Main Branch',  status:'active', jobsCompleted:28, notes:'Senior installer. Specializes in audio.' },
  { id:'tm2', name:'Ben Ramos',     email:'ben@shop.com',   phone:'09172222222', role:'installer',      branch:'Main Branch',  status:'active', jobsCompleted:21, notes:'Tinting specialist.' },
  { id:'tm3', name:'Mario Diaz',    email:'mario@shop.com', phone:'09173333333', role:'installer',      branch:'Main Branch',  status:'active', jobsCompleted:15, notes:'' },
  { id:'tm4', name:'Carlo Santos',  email:'carlo@shop.com', phone:'09174444444', role:'installer',      branch:'North Branch', status:'active', jobsCompleted:8,  notes:'New hire. Under supervision.' },
  { id:'tm5', name:'Maria Reyes',   email:'maria@shop.com', phone:'09175555555', role:'sales_staff',    branch:'Main Branch',  status:'active', jobsCompleted:0,  notes:'Handles quotations and walk-ins.' },
  { id:'tm6', name:'Juan Manager',  email:'juan@shop.com',  phone:'09176666666', role:'branch_manager', branch:'North Branch', status:'active', jobsCompleted:0,  notes:'North branch manager.' },
];

const ROLE_COLORS = {
  super_admin:    'bg-amber-100 text-amber-700',
  branch_manager: 'bg-violet-100 text-violet-700',
  sales_staff:    'bg-sky-100 text-sky-700',
  installer:      'bg-emerald-100 text-emerald-700',
};

const EMPTY = { name:'', email:'', phone:'', role:'installer', branch:'Main Branch', notes:'' };
const f = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

export default function TeamPage() {
  const { profile } = useUser();
  const [members, setMembers]   = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRole]   = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [detail, setDetail]     = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast]       = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(p => ({ ...p, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.show, toast.message, toast.type]);

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    Promise.all([
      teamAPI.getAll(profile?.branchId).catch(() => []),
      branchesAPI.getAll().catch(() => []),
    ]).then(([teamList, branchList]) => {
      setMembers(teamList.length > 0 ? teamList : MOCK);
      setBranches(branchList);
      if (branchList.length > 0) {
        EMPTY.branch = branchList[0].name;
      }
    }).finally(() => setLoading(false));
  }, [profile?.branchId]);

  // RBAC: sales_staff cannot access Team at all
  if (profile && !['super_admin','branch_manager'].includes(profile.role)) {
    return <AccessDenied message="Team management is restricted to Super Admins and Branch Managers." />;
  }

  // Branch Managers can view but not modify team members
  const isReadOnly = profile?.role === 'branch_manager';

  const openAdd  = ()  => { setEditing(null); setForm(EMPTY); setErrorMsg(''); setShowForm(true); };
  const openEdit = m   => {
    setEditing(m);
    setForm({
      ...EMPTY,
      ...m,
      branch: m.branch || m.branchName || '',
    });
    setErrorMsg('');
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const selectedBranch = branches.find(b => b.name === form.branch || b._id === form.branchId);
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        branchId: selectedBranch?.id || selectedBranch?._id || undefined,
        branchName: form.branch || selectedBranch?.name || 'Main Branch',
        status: form.status || 'active',
      };

      if (editing) {
        const { email, ...updatePayload } = payload;
        await teamAPI.update(editing.id || editing._id, updatePayload);
      } else {
        // First, create the Convex profile
        const newId = await teamAPI.add(payload);
        
        // Then, send Clerk invitation email
        const res = await fetch('/api/team/sync-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'invite', email: form.email }),
        });
        const data = await res.json();
        if (!data.success) {
          // Clean up Convex record if Clerk invitation fails
          await teamAPI.delete(newId);
          throw new Error(`Failed to send invitation email via Clerk: ${data.error}`);
        }
      }
      setShowForm(false);
      const refreshed = await teamAPI.getAll(profile?.branchId);
      setMembers(refreshed);
    } catch (err) {
      console.warn('Save team member failed:', err);
      const cleanMsg = err.message?.match(/Uncaught Error:\s*(.*)/)?.[1] || err.message || 'Failed to save team member.';
      setErrorMsg(cleanMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Remove this team member?')) {
      try {
        const member = members.find(m => m.id === id || m._id === id);
        await teamAPI.delete(id);
        
        if (member && member.clerkId) {
          await fetch('/api/team/sync-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', clerkId: member.clerkId }),
          });
        }
        
        const refreshed = await teamAPI.getAll(profile?.branchId);
        setMembers(refreshed);
        triggerToast('Team member removed successfully.', 'success');
      } catch (err) {
        const cleanMsg = err.message?.match(/Uncaught Error:\s*(.*)/)?.[1] || err.message || 'Failed to delete team member.';
        triggerToast(cleanMsg, 'error');
      }
    }
  };

  const toggleStatus = async (id) => {
    const member = members.find(m => m.id === id || m._id === id);
    if (!member) return;
    const nextStatus = member.status === 'active' ? 'inactive' : 'active';
    try {
      await teamAPI.update(id, { status: nextStatus });
      const refreshed = await teamAPI.getAll(profile?.branchId);
      setMembers(refreshed);
      triggerToast(`Team member status updated to ${nextStatus}.`, 'success');
    } catch (err) {
      const cleanMsg = err.message?.match(/Uncaught Error:\s*(.*)/)?.[1] || err.message || 'Failed to toggle status.';
      triggerToast(cleanMsg, 'error');
    }
  };

  const filtered = members.filter(m=>{
    const mr = roleFilter==='all'||m.role===roleFilter;
    const mq = !search||[m.name,m.email,m.phone,m.branch,m.branchName].some(s=>s?.toLowerCase().includes(search.toLowerCase()));
    return mr&&mq;
  });

  const installers = members.filter(m=>m.role==='installer');
  const activeCount = members.filter(m=>m.status==='active').length;

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 mt-1 text-sm">{members.length} members · {activeCount} active · {installers.length} installers</p>
        </div>
        {!isReadOnly && (
          <button onClick={openAdd} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
            <Plus size={17}/> Add Member
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex gap-1.5 flex-wrap">
          {['all',...Object.values(ROLES)].map(r=>(
            <button key={r} onClick={()=>setRole(r)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${roleFilter===r?'bg-orange-500 text-white':'bg-white border border-gray-300 text-gray-600 hover:border-orange-300'}`}>
              {r==='all'?'All':ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-44">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, branch…" className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"/>
          {search && <button onClick={()=>setSearch('')} className="absolute right-3 top-2.5 text-gray-400"><X size={14}/></button>}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length===0 ? (
            <div className="col-span-3 bg-white rounded-xl border border-gray-200 py-16 text-center"><Users size={40} className="mx-auto text-gray-300 mb-3"/><p className="text-gray-500 text-sm">No team members found</p></div>
          ) : filtered.map(m=>(
            <div key={m.id} className={`bg-white rounded-xl border p-5 hover:shadow-sm transition ${m.status==='inactive'?'opacity-60 border-gray-200':'border-gray-200'}`}>
              <div className="flex items-start gap-3 mb-4">
                <div className="h-11 w-11 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-lg flex-shrink-0">{m.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{m.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[m.role]||'bg-gray-100 text-gray-600'}`}>{ROLE_LABELS[m.role]||m.role}</span>
                    {m.status==='inactive' && <span className="text-xs text-gray-400">Inactive</span>}
                  </div>
                </div>
                {!isReadOnly && (
                  <div className="flex gap-1">
                    <button onClick={()=>openEdit(m)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700"><Edit2 size={14}/></button>
                    <button onClick={()=>handleDelete(m.id)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5 text-xs text-gray-500">
                <p className="flex items-center gap-1.5"><Phone size={12}/>{m.phone}</p>
                <p className="flex items-center gap-1.5"><Mail size={12}/>{m.email}</p>
                <p className="flex items-center gap-1.5"><Shield size={12}/>{m.branch || m.branchName}</p>
                {m.role==='installer' && <p className="flex items-center gap-1.5"><UserCheck size={12}/>{m.jobsCompleted} jobs completed</p>}
              </div>
              {m.notes && <p className="text-xs text-gray-400 italic mt-3 line-clamp-2">{m.notes}</p>}
              <div className="mt-4 pt-3 border-t border-gray-100">
                {!isReadOnly ? (
                  <button onClick={()=>toggleStatus(m.id)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${m.status==='active'?'bg-gray-100 hover:bg-gray-200 text-gray-600':'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'}`}>
                    {m.status==='active'?'Deactivate':'Reactivate'}
                  </button>
                ) : (
                  <span className={`text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 text-gray-400 inline-block`}>
                    Status: {m.status==='active'?'Active':'Inactive'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-gray-900">{editing?'Edit Member':'Add Team Member'}</h2><button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
            
            {errorMsg && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl flex items-start gap-2.5 shadow-sm text-xs">
                <AlertCircle className="text-rose-500 mt-0.5 flex-shrink-0" size={16} />
                <div className="flex-1">
                  <p className="font-semibold mb-0.5">Operation Blocked</p>
                  <p className="leading-relaxed">{errorMsg}</p>
                  {errorMsg.includes("Plan limit reached") && (
                    <Link href="/dashboard/billing" className="inline-block mt-2 font-bold text-rose-600 hover:text-rose-800 hover:underline transition">
                      Upgrade Subscription Plan →
                    </Link>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label><input required type="text" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Email *</label><input required type="email" disabled={!!editing} value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} className={f + (editing ? ' bg-gray-100 cursor-not-allowed' : '')}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Phone</label><input type="tel" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
                  <select required value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} className={f}>
                    {Object.entries(ROLE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
                  {branches.length > 0 ? (
                    <select value={form.branch || ''} onChange={e=>setForm(p=>({...p,branch:e.target.value}))} className={f}>
                      {branches.map(b => <option key={b.id || b._id} value={b.name}>{b.name}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={form.branch} onChange={e=>setForm(p=>({...p,branch:e.target.value}))} className={f}/>
                  )}
                </div>

                <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label><textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className={f+' resize-none'}/></div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">{saving?'Saving…':editing?'Update':'Add Member'}</button>
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toast.show && (
        <>
          <style>{`
            @keyframes toast-slide-in {
              0% { transform: translateY(100%) translateY(1.5rem); opacity: 0; }
              100% { transform: translateY(0); opacity: 1; }
            }
            .animate-toast-slide {
              animation: toast-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
          <div className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-white border-l-4 rounded-r-xl rounded-l-sm px-4 py-3.5 shadow-2xl animate-toast-slide max-w-sm md:max-w-md ${
            toast.type === 'success' ? 'border-emerald-500' : 'border-rose-500'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="text-emerald-500 mt-0.5 flex-shrink-0" size={18} />
            ) : (
              <AlertCircle className="text-rose-500 mt-0.5 flex-shrink-0" size={18} />
            )}
            <div className="flex-1 min-w-0 pr-1.5">
              <p className="text-xs font-bold text-gray-900">
                {toast.type === 'success' ? 'Success' : 'Action Blocked'}
              </p>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed break-words font-medium">
                {toast.message}
              </p>
            </div>
            <button onClick={() => setToast(p => ({ ...p, show: false }))} className="text-gray-400 hover:text-gray-600 transition flex-shrink-0 mt-0.5">
              <X size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
