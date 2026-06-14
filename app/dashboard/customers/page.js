'use client';
import { useState, useEffect } from 'react';
import { customersAPI } from '@/lib/convex-api';
import { CAR_MAKES } from '@/lib/constants';
import { Plus, Search, X, Users, Edit2, Trash2, ChevronRight, Car, Phone, Mail, MapPin, Clock } from 'lucide-react';

const MOCK = [
  { id:'c1', name:'Carlos Reyes',     phone:'09171234567', email:'carlos@email.com', address:'Quezon City',  vehicles:[{make:'Toyota',model:'Hilux',year:2022,color:'White',plate:'ABC-1234'}], jobsCount:5, totalSpent:42500, lastVisit:'2024-05-06', notes:'Prefers audio upgrades. Regular client.' },
  { id:'c2', name:'Maria Santos',     phone:'09181234568', email:'maria@email.com',  address:'Makati City',  vehicles:[{make:'Honda',model:'City',year:2021,color:'Blue',plate:'DEF-5678'}],   jobsCount:3, totalSpent:18200, lastVisit:'2024-05-07', notes:'' },
  { id:'c3', name:'Juan Dela Cruz',   phone:'09191234569', email:'juan@email.com',   address:'Taguig',       vehicles:[{make:'Ford',model:'Ranger',year:2023,color:'Black',plate:'GHI-9012'},{make:'Mitsubishi',model:'Montero',year:2019,color:'Silver',plate:'JKL-3456'}], jobsCount:7, totalSpent:68900, lastVisit:'2024-05-08', notes:'VIP client. Multi-vehicle owner.' },
  { id:'c4', name:'Ana Garcia',       phone:'09201234570', email:'ana@email.com',    address:'Pasig City',   vehicles:[{make:'Mitsubishi',model:'Strada',year:2020,color:'Gray',plate:'MNO-7890'}], jobsCount:2, totalSpent:9400, lastVisit:'2024-04-28', notes:'' },
  { id:'c5', name:'Roberto Lim',      phone:'09211234571', email:'rob@email.com',    address:'Mandaluyong',  vehicles:[{make:'Suzuki',model:'Jimny',year:2022,color:'Red',plate:'PQR-1234'}],  jobsCount:4, totalSpent:31200, lastVisit:'2024-05-02', notes:'Interested in lift kit next visit.' },
];

const EMPTY_VEHICLE = { make:'Toyota', model:'', year:new Date().getFullYear(), color:'', plate:'' };
const EMPTY = { name:'', phone:'', email:'', address:'', vehicles:[{...EMPTY_VEHICLE}], notes:'' };
const f = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [detail, setDetail]       = useState(null);
  const [page, setPage]           = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    customersAPI.getAll().then(setCustomers).catch(()=>setCustomers(MOCK)).finally(()=>setLoading(false));
  }, []);

  const openAdd  = ()  => { setEditing(null); setForm({...EMPTY,vehicles:[{...EMPTY_VEHICLE}]}); setShowForm(true); };
  const openEdit = c   => { setEditing(c); setForm({...c}); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        address: form.address || undefined,
        vehicles: form.vehicles.map(v => ({
          make: v.make,
          model: v.model,
          year: Number(v.year) || new Date().getFullYear(),
          color: v.color || undefined,
          plate: v.plate || undefined,
        })),
        notes: form.notes || undefined,
      };

      if (editing) {
        const id = editing._id || editing.id;
        await customersAPI.update(id, payload);
      } else {
        await customersAPI.add(payload);
      }
      setShowForm(false);
      const list = await customersAPI.getAll();
      setCustomers(list);
    } catch (err) {
      alert(err.message || 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this customer?')) {
      try {
        await customersAPI.delete(id);
        const list = await customersAPI.getAll();
        setCustomers(list);
      } catch (err) {
        alert(err.message || 'Failed to delete customer.');
      }
    }
  };

  const addVehicle    = () => setForm(p=>({...p,vehicles:[...p.vehicles,{...EMPTY_VEHICLE}]}));
  const removeVehicle = i  => setForm(p=>({...p,vehicles:p.vehicles.filter((_,j)=>j!==i)}));
  const updateVehicle = (i,k,v) => setForm(p=>({...p,vehicles:p.vehicles.map((v2,j)=>j===i?{...v2,[k]:v}:v2)}));

  const filtered = customers.filter(c =>
    !search || [c.name,c.phone,c.email,...(c.vehicles||[]).map(v=>`${v.make} ${v.model} ${v.plate}`)].some(s=>s?.toLowerCase().includes(search.toLowerCase()))
  );

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page-1)*ITEMS_PER_PAGE, page*ITEMS_PER_PAGE);

  return (
    <div className="p-4 md:p-8">
      {/* Sticky Header & Search Container */}
      <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 -mx-4 md:-mx-8 px-4 md:px-8 pt-2 pb-4 border-b border-gray-200/60 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-500 mt-1 text-sm">{customers.length} customers · {customers.reduce((s,c)=>s+c.vehicles.length,0)} vehicles on record</p>
          </div>
          <button onClick={openAdd} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
            <Plus size={17}/> Add Customer
          </button>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 sm:top-2.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, phone, vehicle, plate number…"
            className="w-full pl-9 pr-8 py-2.5 sm:py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"/>
          {search && <button onClick={()=>setSearch('')} className="absolute right-3 top-3 sm:top-2.5 text-gray-400"><X size={14}/></button>}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/></div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filtered.length===0 ? (
            <div className="py-16 text-center"><Users size={40} className="mx-auto text-gray-300 mb-3"/><p className="text-gray-500 text-sm">No customers found</p></div>
          ) : (
            <div>
              {/* Mobile Card List View */}
              <div className="divide-y divide-gray-100 md:hidden">
                {paginated.map(c => (
                  <div
                    key={c._id || c.id}
                    className="p-4 hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer flex flex-col gap-2"
                    onClick={() => setDetail(c)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                          {c.address && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={11} /> {c.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-gray-900">₱{c.totalSpent.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{c.jobsCount} jobs</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs text-gray-500 border-t border-gray-100/60 pt-2.5 mt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1"><Phone size={11} /> {c.phone}</span>
                        {c.email && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="flex items-center gap-1"><Mail size={11} /> {c.email}</span>
                          </>
                        )}
                      </div>
                      
                      {c.vehicles && c.vehicles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {c.vehicles.slice(0, 2).map((v, i) => (
                            <span key={i} className="text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-gray-100/50">
                              <Car size={10} className="text-orange-400" />
                              {v.year} {v.make} {v.model}
                            </span>
                          ))}
                          {c.vehicles.length > 2 && (
                            <span className="text-[11px] text-gray-400 font-medium flex-shrink-0">
                              +{c.vehicles.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-gray-100/60">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> Last visit: {c.lastVisit || 'N/A'}
                      </span>
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(c._id || c.id)} className="p-1.5 hover:bg-rose-50 rounded-md text-gray-400 hover:text-rose-600 transition">
                          <Trash2 size={13} />
                        </button>
                        <button onClick={() => setDetail(c)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition">
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[800px] md:min-w-0">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Customer','Contact','Vehicles','Jobs','Spent','Last Visit',''].map(h=>(
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginated.map(c => (
                      <tr key={c._id || c.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={()=>setDetail(c)}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm flex-shrink-0">{c.name.charAt(0)}</div>
                            <div><p className="text-sm font-semibold text-gray-900">{c.name}</p><p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={11}/>{c.address}</p></div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="space-y-0.5">
                            <p className="text-xs text-gray-600 flex items-center gap-1"><Phone size={11}/>{c.phone}</p>
                            {c.email && <p className="text-xs text-gray-600 flex items-center gap-1"><Mail size={11}/>{c.email}</p>}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="space-y-0.5">
                            {c.vehicles.slice(0,2).map((v,i)=>(
                              <p key={i} className="text-xs text-gray-700 flex items-center gap-1"><Car size={11} className="text-orange-400"/>{v.year} {v.make} {v.model}</p>
                            ))}
                            {c.vehicles.length>2 && <p className="text-xs text-gray-400">+{c.vehicles.length-2} more</p>}
                          </div>
                        </td>
                        <td className="px-5 py-3"><span className="bg-orange-50 text-orange-700 text-xs font-medium px-2.5 py-1 rounded-full">{c.jobsCount}</span></td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900">₱{c.totalSpent.toLocaleString()}</td>
                        <td className="px-5 py-3 text-xs text-gray-500 flex items-center gap-1 mt-3"><Clock size={11}/>{c.lastVisit}</td>
                        <td className="px-5 py-3" onClick={e=>e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button onClick={()=>openEdit(c)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition"><Edit2 size={14}/></button>
                            <button onClick={()=>handleDelete(c._id || c.id)} className="p-1.5 hover:bg-rose-50 rounded-md text-gray-400 hover:text-rose-600 transition"><Trash2 size={14}/></button>
                            <button onClick={()=>setDetail(c)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition"><ChevronRight size={15}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 p-4">
                  <button
                    disabled={page === 1}
                    onClick={()=>setPage(p=>Math.max(1, p-1))}
                    className="px-3.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-500 font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={()=>setPage(p=>Math.min(totalPages, p+1))}
                    className="px-3.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={()=>setDetail(null)}>
          <div className="bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold">{detail.name.charAt(0)}</div>
                <div><p className="font-bold text-gray-900">{detail.name}</p><p className="text-xs text-gray-500">{detail.address}</p></div>
              </div>
              <button onClick={()=>setDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[{l:'Phone',v:detail.phone},{l:'Email',v:detail.email||'—'},{l:'Total Jobs',v:detail.jobsCount},{l:'Total Spent',v:`₱${detail.totalSpent.toLocaleString()}`},{l:'Last Visit',v:detail.lastVisit}].map(i=>(
                  <div key={i.l} className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-0.5">{i.l}</p><p className="font-semibold text-gray-900 text-sm">{i.v}</p></div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Vehicles</p>
                <div className="space-y-2">
                  {detail.vehicles.map((v,i)=>(
                    <div key={i} className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3">
                      <Car size={18} className="text-orange-500 flex-shrink-0"/>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{v.year} {v.make} {v.model}</p>
                        <p className="text-xs text-gray-500">{v.color} · {v.plate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {detail.notes && <div><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-sm text-gray-700 italic">{detail.notes}</p></div>}
              <div className="flex gap-2">
                <button onClick={()=>{setDetail(null);openEdit(detail);}} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 rounded-xl transition">Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6 max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">{editing?'Edit Customer':'New Customer'}</h2>
              <button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label><input required type="text" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label><input required type="tel" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Email</label><input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} className={f}/></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Address</label><input type="text" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} className={f}/></div>
                {/* Vehicles */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">Vehicles</label>
                    <button type="button" onClick={addVehicle} className="text-xs text-orange-500 hover:text-orange-700 font-medium flex items-center gap-1"><Plus size={13}/>Add vehicle</button>
                  </div>
                  {form.vehicles.map((v,i)=>(
                    <div key={i} className="border border-gray-200 rounded-xl p-3 mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-600">Vehicle {i+1}</p>
                        {i>0 && <button type="button" onClick={()=>removeVehicle(i)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-xs text-gray-500 mb-1">Make</label>
                          <select value={v.make} onChange={e=>updateVehicle(i,'make',e.target.value)} className={f}>
                            {CAR_MAKES.map(m=><option key={m}>{m}</option>)}
                          </select>
                        </div>
                        <div><label className="block text-xs text-gray-500 mb-1">Model</label><input type="text" placeholder="Hilux" value={v.model} onChange={e=>updateVehicle(i,'model',e.target.value)} className={f}/></div>
                        <div><label className="block text-xs text-gray-500 mb-1">Year</label><input type="number" min="1990" max="2030" value={v.year} onChange={e=>updateVehicle(i,'year',e.target.value)} className={f}/></div>
                        <div><label className="block text-xs text-gray-500 mb-1">Color</label><input type="text" placeholder="White" value={v.color} onChange={e=>updateVehicle(i,'color',e.target.value)} className={f}/></div>
                        <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Plate Number</label><input type="text" placeholder="ABC-1234" value={v.plate} onChange={e=>updateVehicle(i,'plate',e.target.value)} className={f}/></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label><textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className={f+' resize-none'}/></div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">{saving?'Saving…':editing?'Update':'Add Customer'}</button>
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
