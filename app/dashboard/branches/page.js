'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { branchesAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import AccessDenied from '@/components/AccessDenied';
import { Plus, X, GitBranch, Edit2, Trash2, MapPin, Phone, Mail, Users, Package, DollarSign, AlertCircle } from 'lucide-react';

const MOCK = [
  { id:'b1', name:'Main Branch',  address:'123 Ortigas Ave, Pasig City',  phone:'02-1234-5678', email:'main@autocrew.com',  manager:'Juan Manager',  staffCount:5, productCount:120, monthRevenue:61800, status:'active', isMain:true,  createdAt:'2023-01-01' },
  { id:'b2', name:'North Branch', address:'456 Mindanao Ave, Quezon City', phone:'02-2345-6789', email:'north@autocrew.com', manager:'Maria Manager', staffCount:3, productCount:68,  monthRevenue:25600, status:'active', isMain:false, createdAt:'2023-06-15' },
];

const EMPTY = { name:'', address:'', phone:'', email:'', manager:'', notes:'', latitude: '', longitude: '', geofenceRadius: 50 };
const f = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

export default function BranchesPage() {
  const { profile } = useUser();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    branchesAPI.getAll().then(setBranches).catch(()=>setBranches(MOCK)).finally(()=>setLoading(false));
  }, []);

  if (profile && profile.role !== 'super_admin') {
    return <AccessDenied message="Branch management is restricted to Super Admins only." />;
  }

  const openAdd  = ()  => { setEditing(null); setForm(EMPTY); setErrorMsg(''); setShowForm(true); };
  const openEdit = b   => {
    setEditing(b);
    setForm({
      ...EMPTY,
      ...b,
      geofenceRadius: b.geofenceRadius ?? b.geofencerRadius ?? 50
    });
    setErrorMsg('');
    setShowForm(true);
  };

  const reload = () => branchesAPI.getAll().then(setBranches).catch(()=>{});

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setErrorMsg('');
    try {
      const payload = {
        name: form.name,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        manager: form.manager || undefined,
        notes: form.notes || undefined,
        status: form.status || undefined,
        latitude: (form.latitude !== undefined && form.latitude !== '' && form.latitude !== null) ? Number(form.latitude) : undefined,
        longitude: (form.longitude !== undefined && form.longitude !== '' && form.longitude !== null) ? Number(form.longitude) : undefined,
        geofenceRadius: (form.geofenceRadius !== undefined && form.geofenceRadius !== '' && form.geofenceRadius !== null) ? Number(form.geofenceRadius) : undefined,
      };
      
      if (editing) {
        await branchesAPI.update(editing.id || editing._id, payload);
      } else {
        await branchesAPI.add(payload);
      }
      await reload();
      setShowForm(false);
    } catch (err) {
      console.warn('Save branch failed:', err);
      const cleanMsg = err.message?.match(/Uncaught Error:\s*(.*)/)?.[1] || err.message || 'Failed to save branch. Please try again.';
      setErrorMsg(cleanMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this branch? All associated data will be unlinked.')) return;
    try {
      await branchesAPI.delete(id);
      await reload();
    } catch (err) {
      console.error('Delete branch failed:', err);
      alert(err.message || 'Failed to delete branch.');
    }
  };

  const totalRevenue = branches.reduce((s,b)=>s+b.monthRevenue,0);

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Branches</h1>
          <p className="text-gray-500 mt-1 text-sm">{branches.length} branch{branches.length!==1?'es':''} · ₱{totalRevenue.toLocaleString()} combined monthly revenue</p>
        </div>
        <button onClick={openAdd} className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition w-full sm:w-auto flex-shrink-0">
          <Plus size={17}/> Add Branch
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/></div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {branches.map(b=>(
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2.5 rounded-xl"><GitBranch size={20} className="text-orange-600"/></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">{b.name}</p>
                      {b.isMain && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">Main</span>}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.status==='active'?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-500'}`}>{b.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Since {b.createdAt || (b._creationTime ? new Date(b._creationTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={()=>openEdit(b)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700"><Edit2 size={15}/></button>
                  {!b.isMain && <button onClick={()=>handleDelete(b.id)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-600"><Trash2 size={15}/></button>}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-xs text-gray-600 flex items-center gap-2"><MapPin size={13} className="text-gray-400"/>{b.address}</p>
                <p className="text-xs text-gray-600 flex items-center gap-2"><Phone size={13} className="text-gray-400"/>{b.phone}</p>
                <p className="text-xs text-gray-600 flex items-center gap-2"><Mail size={13} className="text-gray-400"/>{b.email}</p>
                {b.manager && <p className="text-xs text-gray-600 flex items-center gap-2"><Users size={13} className="text-gray-400"/>Manager: {b.manager}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                {[{l:'Staff',v:b.staffCount,icon:Users},{l:'Products',v:b.productCount,icon:Package},{l:'Mo. Revenue',v:`₱${(b.monthRevenue/1000).toFixed(1)}k`,icon:DollarSign}].map(item=>(
                  <div key={item.l} className="bg-gray-50 rounded-lg p-3 text-center">
                    <item.icon size={14} className="mx-auto text-gray-400 mb-1"/>
                    <p className="text-sm font-bold text-gray-900">{item.v}</p>
                    <p className="text-xs text-gray-400">{item.l}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4 md:p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-gray-900">{editing?'Edit Branch':'New Branch'}</h2><button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
            
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
              <div className="space-y-4 mb-4">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Branch Name *</label><input required type="text" value={form.name || ''} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className={f} placeholder="e.g. South Branch"/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Address</label><input type="text" value={form.address || ''} onChange={e=>setForm(p=>({...p,address:e.target.value}))} className={f}/></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Phone</label><input type="tel" value={form.phone || ''} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} className={f}/></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Email</label><input type="email" value={form.email || ''} onChange={e=>setForm(p=>({...p,email:e.target.value}))} className={f}/></div>
                </div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Branch Manager</label><input type="text" value={form.manager || ''} onChange={e=>setForm(p=>({...p,manager:e.target.value}))} className={f}/></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
                    <input type="number" step="any" value={form.latitude ?? ''} onChange={e=>setForm(p=>({...p,latitude:e.target.value}))} className={f} placeholder="e.g. 14.5995"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
                    <input type="number" step="any" value={form.longitude ?? ''} onChange={e=>setForm(p=>({...p,longitude:e.target.value}))} className={f} placeholder="e.g. 120.9842"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Geofence (m)</label>
                    <input type="number" min="1" value={form.geofenceRadius ?? ''} onChange={e=>setForm(p=>({...p,geofenceRadius:e.target.value}))} className={f} placeholder="50"/>
                  </div>
                </div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label><textarea rows={2} value={form.notes || ''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className={f+' resize-none'}/></div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button type="button" onClick={()=>setShowForm(false)} className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition">Cancel</button>
                <button type="submit" disabled={saving} className="w-full sm:flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">{saving?'Saving…':editing?'Update':'Add Branch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
