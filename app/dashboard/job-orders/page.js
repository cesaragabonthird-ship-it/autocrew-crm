'use client';
import { useState, useEffect } from 'react';
import { jobsAPI, customersAPI, teamAPI, productsAPI, branchesAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import { JOB_STATUSES, JOB_TYPES, PAYMENT_METHODS } from '@/lib/constants';
import { Plus, Search, X, ClipboardList, Edit2, Trash2, ChevronRight, Car, User, Clock, DollarSign, Wrench, CheckCircle2, UserCheck } from 'lucide-react';

const MOCK_JOBS = [
  { id:'j1', jobNumber:'JO-0001', customer:'Carlos Reyes',   phone:'09171234567', vehicle:'2022 Toyota Hilux (ABC-1234)',  type:'Audio Installation',  description:'Install Pioneer AVH-Z9200BT + speakers', status:'in_progress', assignedTo:'Alex Cruz',   branch:'Main',  scheduledDate:'2024-05-08', amount:12500, parts:[{name:'Pioneer AVH-Z9200BT',qty:1,price:8000},{name:'Speaker Set',qty:1,price:2500}], labor:2000, notes:'Customer wants clean install', createdAt:'2024-05-07' },
  { id:'j2', jobNumber:'JO-0002', customer:'Maria Santos',   phone:'09181234568', vehicle:'2021 Honda City (DEF-5678)',    type:'Window Tinting',      description:'Full car tint with Carbon Film 35%',     status:'assigned',    assignedTo:'Ben Ramos',   branch:'Main',  scheduledDate:'2024-05-09', amount:6500,  parts:[{name:'Carbon Film 35%',qty:5,price:350}],                              labor:4750, notes:'', createdAt:'2024-05-08' },
  { id:'j3', jobNumber:'JO-0003', customer:'Juan Dela Cruz', phone:'09191234569', vehicle:'2023 Ford Ranger (GHI-9012)',   type:'Alarm Installation',  description:'Viper 5906V alarm with remote start',   status:'pending',     assignedTo:'',            branch:'Main',  scheduledDate:'2024-05-10', amount:7800,  parts:[{name:'Viper 5906V Alarm',qty:1,price:4000}],                           labor:3800, notes:'', createdAt:'2024-05-08' },
  { id:'j4', jobNumber:'JO-0004', customer:'Ana Garcia',     phone:'09201234570', vehicle:'2020 Mitsubishi Strada (MNO-7890)',type:'LED Lighting',    description:'LED H4 headlight upgrade',               status:'completed',   assignedTo:'Alex Cruz',   branch:'North', scheduledDate:'2024-05-07', amount:3800,  parts:[{name:'LED H4 Bulb Set',qty:1,price:680}],                              labor:3120, notes:'Done and tested', createdAt:'2024-05-06' },
  { id:'j5', jobNumber:'JO-0005', customer:'Roberto Lim',    phone:'09211234571', vehicle:'2022 Suzuki Jimny (PQR-1234)', type:'GPS Tracker Installation',description:'Garmin GPS tracker hidden install',  status:'assigned',    assignedTo:'Mario Diaz',  branch:'Main',  scheduledDate:'2024-05-09', amount:9500,  parts:[{name:'Garmin GPS 65s',qty:1,price:8500}],                              labor:1000, notes:'', createdAt:'2024-05-08' },
];

const MOCK_TECHNICIANS = [
  {id:'t1',name:'Alex Cruz'},{id:'t2',name:'Ben Ramos'},{id:'t3',name:'Mario Diaz'},{id:'t4',name:'Carlo Santos'},
];

const EMPTY = { customer:'', phone:'', vehicle:'', vehiclePlate:'', type:'', description:'', status:'pending', assignedTo:'', branch:'Main', scheduledDate:'', parts:[{name:'',qty:1,price:''}], labor:'', notes:'' };
const f = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

export default function JobOrdersPage() {
  const { profile } = useUser();
  const [jobs, setJobs]           = useState([]);
  const [technicians, setTechs]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [detail, setDetail]       = useState(null);
  const [products, setProducts]   = useState([]);
  const [branches, setBranches]   = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  useEffect(() => {
    let alive = true;
    jobsAPI.getAll(profile?.branchName || profile?.branchId)
      .then(list => { if (alive) setJobs(list); })
      .catch(() => { if (alive) setJobs(MOCK_JOBS); })
      .finally(() => { if (alive) setLoading(false); });

    teamAPI.getAll(profile?.branchId)
      .then(list => { if (alive) setTechs(list.filter(t => t.role === 'installer')); })
      .catch(console.error);

    productsAPI.getAll(profile?.branchName || profile?.branchId)
      .then(list => { if (alive) setProducts(list); })
      .catch(console.error);

    branchesAPI.getAll()
      .then(list => { if (alive) setBranches(list); })
      .catch(console.error);

    customersAPI.getAll()
      .then(list => { if (alive) setCustomers(list); })
      .catch(console.error);

    const clickAway = () => setShowCustDropdown(false);
    window.addEventListener('click', clickAway);

    return () => {
      alive = false;
      window.removeEventListener('click', clickAway);
    };
  }, [profile?.branchName, profile?.branchId]);

  const nextNum   = () => `JO-${String(jobs.length+1).padStart(4,'0')}`;
  const openAdd   = ()  => { setEditing(null); setForm({...EMPTY,scheduledDate:new Date().toISOString().slice(0,10), branch: profile?.branchName || 'Main Branch'}); setShowForm(true); };
  const openEdit  = j   => { setEditing(j); setForm({ customerId: j.customerId, ...j }); setShowForm(true); };

  const calcTotal = (parts,labor) => {
    const partsTotal = (parts||[]).reduce((s,p)=>(s+(+p.qty||0)*(+p.price||0)),0);
    return partsTotal + (+labor||0);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        jobNumber: form.jobNumber || nextNum(),
        customerId: form.customerId || undefined,
        customer: form.customer,
        phone: form.phone || undefined,
        vehicle: form.vehicle || undefined,
        vehiclePlate: form.vehiclePlate || undefined,
        type: form.type,
        description: form.description || undefined,
        status: form.status || 'pending',
        assignedTo: form.assignedTo || undefined,
        assignedClerkId: form.assignedTo ? (technicians.find(t=>t.name===form.assignedTo)?.clerkId || undefined) : undefined,
        branch: form.branch || profile?.branchName || 'Main Branch',
        scheduledDate: form.scheduledDate || undefined,
        parts: form.parts.map(p => ({
          name: p.name,
          qty: Number(p.qty) || 0,
          price: Number(p.price) || 0,
          sku: p.sku || undefined,
        })),
        labor: Number(form.labor) || 0,
        amount: calcTotal(form.parts, form.labor),
        notes: form.notes || undefined,
      };

      if (editing) {
        await jobsAPI.update(editing.id || editing._id, payload);
      } else {
        await jobsAPI.add(payload);
      }
      setShowForm(false);
      const list = await jobsAPI.getAll(profile?.branchName || profile?.branchId);
      setJobs(list);
    } catch (err) {
      alert(err.message || 'Failed to save job order.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete job order?')) {
      try {
        await jobsAPI.delete(id);
        const list = await jobsAPI.getAll(profile?.branchName || profile?.branchId);
        setJobs(list);
      } catch (err) {
        alert(err.message || 'Failed to delete job order.');
      }
    }
  };

  const cycleStatus = async (id, current) => {
    const order = ['pending', 'assigned', 'in_progress', 'completed'];
    const next = order[Math.min(order.indexOf(current) + 1, order.length - 1)];
    try {
      await jobsAPI.updateStatus(id, next);
      const list = await jobsAPI.getAll(profile?.branchName || profile?.branchId);
      setJobs(list);
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const assignTech = async (id, name) => {
    const techDoc = technicians.find(t => t.name === name);
    try {
      await jobsAPI.assign(id, name, techDoc?.clerkId || techDoc?.id || '');
      const list = await jobsAPI.getAll(profile?.branchName || profile?.branchId);
      setJobs(list);
    } catch (err) {
      alert(err.message || 'Failed to assign installer.');
    }
  };

  const addPart    = () => setForm(p=>({...p,parts:[...p.parts,{name:'',qty:1,price:'',sku:''}]}));
  const removePart = i  => setForm(p=>({...p,parts:p.parts.filter((_,j)=>j!==i)}));
  const updatePart = (i,k,v) => setForm(p=>({...p,parts:p.parts.map((pt,j)=>j===i?{...pt,[k]:v}:pt)}));

  const filtered = jobs.filter(j=>{
    const ms = statusFilter==='all'||j.status===statusFilter;
    const mq = !search||[j.jobNumber,j.customer,j.vehicle,j.type,j.assignedTo].some(s=>s?.toLowerCase().includes(search.toLowerCase()));
    return ms&&mq;
  });

  const limit = 10;
  const totalPages = Math.ceil(filtered.length / limit) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filtered.length, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * limit;
  const paginatedJobs = filtered.slice(startIndex, startIndex + limit);

  const uniqueProducts = [];
  const seenProducts = new Set();
  for (const p of products) {
    const key = `${p.name?.toLowerCase().trim()}::${p.sku?.toLowerCase().trim() || ''}`;
    if (!seenProducts.has(key)) {
      seenProducts.add(key);
      uniqueProducts.push(p);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Job Orders</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {jobs.filter(j=>j.status==='pending').length} pending · {jobs.filter(j=>j.status==='assigned').length} assigned · {jobs.filter(j=>j.status==='in_progress').length} in progress
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
          <Plus size={17}/> New Job Order
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex gap-1.5 flex-wrap">
          {['all',...Object.keys(JOB_STATUSES)].map(s=>(
            <button key={s} onClick={()=>{ setStatus(s); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter===s?'bg-orange-500 text-white':'bg-white border border-gray-300 text-gray-600 hover:border-orange-300'}`}>
              {s==='all'?'All':JOB_STATUSES[s]?.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-44">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400"/>
          <input value={search} onChange={e=>{ setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search customer, vehicle, job type…" className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"/>
          {search && <button onClick={()=>{ setSearch(''); setCurrentPage(1); }} className="absolute right-3 top-2.5 text-gray-400"><X size={14}/></button>}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/></div> : (
        <div className="space-y-3">
          {paginatedJobs.length===0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-16 text-center"><ClipboardList size={40} className="mx-auto text-gray-300 mb-3"/><p className="text-gray-500 text-sm">No job orders found</p></div>
          ) : paginatedJobs.map(job => {
            const sm = JOB_STATUSES[job.status] || JOB_STATUSES.pending;
            return (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{job.jobNumber}</span>
                      <h3 className="font-semibold text-gray-900 text-sm">{job.customer}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span>
                      <span className="ml-auto font-bold text-gray-900">₱{job.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 text-xs text-gray-500 mb-2">
                      <span className="flex items-center gap-1"><Car size={11}/>{job.vehicle}</span>
                      <span className="flex items-center gap-1"><Wrench size={11}/>{job.type}</span>
                      {job.assignedTo && <span className="flex items-center gap-1"><UserCheck size={11}/>{job.assignedTo}</span>}
                      {job.scheduledDate && <span className="flex items-center gap-1"><Clock size={11}/>{job.scheduledDate}</span>}
                    </div>
                    {(job.notes || job.description) && <p className="text-xs text-gray-400 italic truncate">{job.notes || job.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Quick assign if unassigned */}
                    {!job.assignedTo && (
                      <select onChange={e=>assignTech(job.id,e.target.value)} defaultValue=""
                        className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none">
                        <option value="" disabled>Assign…</option>
                        {technicians.map(t=><option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                    )}
                    <button onClick={()=>setDetail(job)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700"><ChevronRight size={16}/></button>
                    <button onClick={()=>openEdit(job)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700"><Edit2 size={14}/></button>
                    <button onClick={()=>handleDelete(job.id)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination controls */}
          {filtered.length > limit && (
            <div className="flex items-center justify-between mt-6 bg-white border border-gray-200 rounded-xl px-5 py-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <span className="text-xs font-medium text-gray-500">
                Showing {startIndex + 1} to {Math.min(startIndex + limit, filtered.length)} of {filtered.length} job orders
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={()=>setDetail(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div><p className="font-bold text-gray-900">{detail.customer}</p><p className="text-xs font-mono text-gray-400">{detail.jobNumber}</p></div>
              <button onClick={()=>setDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-5 space-y-5">
              <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${JOB_STATUSES[detail.status]?.cls}`}>{JOB_STATUSES[detail.status]?.label}</span>
              <div className="grid grid-cols-2 gap-3">
                {[{l:'Vehicle',v:detail.vehicle},{l:'Type',v:detail.type},{l:'Assigned To',v:detail.assignedTo||'Unassigned'},{l:'Branch',v:detail.branch},{l:'Scheduled',v:detail.scheduledDate},{l:'Phone',v:detail.phone}].map(i=>(
                  <div key={i.l} className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-0.5">{i.l}</p><p className="font-semibold text-gray-900 text-sm">{i.v}</p></div>
                ))}
              </div>
              {(detail.notes || detail.description) && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700 italic">{detail.notes || detail.description}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Parts & Materials</p>
                <div className="space-y-1.5">
                  {(detail.parts||[]).map((p,i)=>(
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">{p.name} × {p.qty}</span>
                      <span className="font-medium text-gray-900">₱{((p.qty||0)*(p.price||0)).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 border-t border-gray-200 pt-3">
                <div className="flex justify-between text-sm text-gray-600"><span>Parts Total</span><span>₱{(detail.parts||[]).reduce((s,p)=>s+(p.qty||0)*(p.price||0),0).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm text-gray-600"><span>Labor</span><span>₱{(detail.labor||0).toLocaleString()}</span></div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span>₱{detail.amount.toLocaleString()}</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>{setDetail(null);openEdit(detail);}} className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 rounded-xl transition">Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">{editing?'Edit Job Order':'New Job Order'}</h2>
              <button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Job Order Number (Auto-generated)</label><input readOnly type="text" value={form.jobNumber || nextNum()} className={f + " bg-gray-50 cursor-not-allowed"}/></div>
                <div className="hidden md:block"></div>
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
                  <input
                    required
                    type="text"
                    value={form.customer}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(p => ({ ...p, customer: val, customerId: undefined }));
                      setShowCustDropdown(true);
                    }}
                    onFocus={() => setShowCustDropdown(true)}
                    className={f}
                  />
                  {showCustDropdown && form.customer && (
                    (() => {
                      const matches = customers.filter(c =>
                        c.name.toLowerCase().includes(form.customer.toLowerCase()) ||
                        c.phone.toLowerCase().includes(form.customer.toLowerCase())
                      );
                      if (matches.length === 0) return null;
                      return (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                          {matches.map(c => (
                            <button
                              key={c._id || c.id}
                              type="button"
                              onClick={() => {
                                setForm(p => ({
                                  ...p,
                                  customer: c.name,
                                  phone: c.phone || p.phone,
                                  customerId: c._id || c.id,
                                  vehicle: c.vehicles?.[0] ? `${c.vehicles[0].year} ${c.vehicles[0].make} ${c.vehicles[0].model}` : p.vehicle,
                                  vehiclePlate: c.vehicles?.[0]?.plate || p.vehiclePlate
                                }));
                                setShowCustDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 transition flex items-center justify-between border-b border-gray-50 last:border-0"
                            >
                              <div>
                                <p className="font-semibold text-gray-900">{c.name}</p>
                                <p className="text-xs text-gray-500">{c.phone}</p>
                              </div>
                              {c.vehicles?.[0] && (
                                <span className="text-xs bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-100">
                                  {c.vehicles[0].make} {c.vehicles[0].model}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.phone || ''}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className={f}
                  />
                </div>

                {form.customerId && (() => {
                  const selectedCust = customers.find(c => (c._id || c.id) === form.customerId);
                  if (!selectedCust || !selectedCust.vehicles || selectedCust.vehicles.length === 0) return null;
                  return (
                    <div className="col-span-2 bg-orange-50/50 border border-orange-100 rounded-xl p-3 flex flex-col gap-2">
                      <label className="text-xs font-semibold text-gray-700">Select Customer's Registered Vehicle:</label>
                      <div className="flex gap-2 flex-wrap">
                        {selectedCust.vehicles.map((v, idx) => {
                          const displayLabel = `${v.year} ${v.make} ${v.model} ${v.plate ? `(${v.plate})` : ''}`;
                          const isActive = form.vehicle === `${v.year} ${v.make} ${v.model}` && form.vehiclePlate === v.plate;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setForm(p => ({
                                  ...p,
                                  vehicle: `${v.year} ${v.make} ${v.model}`,
                                  vehiclePlate: v.plate || ''
                                }));
                              }}
                              className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition ${
                                isActive
                                  ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                                  : 'bg-white border-gray-300 text-gray-700 hover:border-orange-300'
                              }`}
                            >
                              {displayLabel}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            setForm(p => ({ ...p, vehicle: '', vehiclePlate: '' }));
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 bg-white text-gray-500 hover:border-gray-400 font-semibold"
                        >
                          + New Vehicle
                        </button>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle (Year Make Model)</label>
                  <input
                    type="text"
                    placeholder="2023 Toyota Hilux"
                    value={form.vehicle || ''}
                    onChange={e => setForm(p => ({ ...p, vehicle: e.target.value }))}
                    className={f}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Plate Number</label>
                  <input
                    type="text"
                    placeholder="ABC-1234"
                    value={form.vehiclePlate || ''}
                    onChange={e => setForm(p => ({ ...p, vehiclePlate: e.target.value }))}
                    className={f}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Job Type *</label>
                  <select required value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className={f}>
                    <option value="">Select…</option>
                    {JOB_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Scheduled Date</label>
                  <input type="date" value={form.scheduledDate} onChange={e=>setForm(p=>({...p,scheduledDate:e.target.value}))} className={f}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Assign To</label>
                  <select
                    value={form.assignedTo}
                    onChange={e => {
                      const name = e.target.value;
                      setForm(p => {
                        let newStatus = p.status;
                        if (name && p.status === 'pending') {
                          newStatus = 'assigned';
                        } else if (!name && p.status === 'assigned') {
                          newStatus = 'pending';
                        }
                        return { ...p, assignedTo: name, status: newStatus };
                      });
                    }}
                    className={f}
                  >
                    <option value="">Unassigned</option>
                    {technicians.map(t=><option key={t.id || t._id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className={f}>
                    {Object.entries(JOB_STATUSES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                {/* Parts */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">Parts & Materials</label>
                    <button type="button" onClick={addPart} className="text-xs text-orange-500 hover:text-orange-700 font-medium flex items-center gap-1"><Plus size={13}/>Add part</button>
                  </div>
                  <div className="space-y-2">
                    {form.parts.map((pt,i)=>(
                      <div key={i} className="flex gap-2 items-center">
                        <div className="flex-1 relative">
                          <select
                            required
                            value={pt.name}
                            onChange={e => {
                              const selectedName = e.target.value;
                              const matched = products.find(p => p.name === selectedName);
                              if (matched) {
                                updatePart(i, 'name', matched.name);
                                updatePart(i, 'price', matched.sellingPrice);
                                updatePart(i, 'sku', matched.sku);
                              } else {
                                updatePart(i, 'name', selectedName);
                                updatePart(i, 'price', '');
                                updatePart(i, 'sku', '');
                              }
                            }}
                            className={f.replace('w-full', '') + ' w-full'}
                          >
                            <option value="">Select part…</option>
                            {uniqueProducts.map(p => (
                              <option key={p.id || p._id} value={p.name}>
                                {p.name} (SKU: {p.sku || 'N/A'})
                              </option>
                            ))}
                          </select>
                        </div>
                        <input type="number" placeholder="Qty" min="1" value={pt.qty} onChange={e=>updatePart(i,'qty',e.target.value)} className={f.replace('w-full', '') + ' w-16'}/>
                        <input type="number" placeholder="Price ₱" min="0" value={pt.price} onChange={e=>updatePart(i,'price',e.target.value)} className={f.replace('w-full', '') + ' w-24'}/>
                        <button type="button" onClick={()=>removePart(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0"><X size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Labor Fee (₱)</label><input type="number" min="0" value={form.labor} onChange={e=>setForm(p=>({...p,labor:e.target.value}))} className={f}/></div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Total Amount (₱)</label>
                  <input
                    readOnly
                    type="text"
                    value={`₱${calcTotal(form.parts, form.labor).toLocaleString()}`}
                    className={f + " bg-gray-50 font-semibold text-orange-600 cursor-not-allowed"}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className={f+' resize-none'}/>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">{saving?'Saving…':editing?'Update':'Create Job Order'}</button>
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
