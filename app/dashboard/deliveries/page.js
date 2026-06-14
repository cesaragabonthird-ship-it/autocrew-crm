'use client';
import { useState, useEffect } from 'react';
import { deliveriesAPI, productsAPI, branchesAPI, poAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import { DELIVERY_STATUSES } from '@/lib/constants';
import { Plus, Search, X, Truck, Check, AlertCircle, ChevronRight, Edit2, Package, Trash2, ChevronDown } from 'lucide-react';
import UpgradeOverlay from '@/components/UpgradeOverlay';

const MOCK = [
  { id:'d1', deliveryNumber:'DEL-0001', poNumber:'PO-0001', supplier:'Pioneer PH',  branch:'Main',  status:'received', deliveryDate:'2024-05-06', items:[{name:'Pioneer AVH-Z9200BT',qtyExpected:5,qtyReceived:5,condition:'Good'}], receivedBy:'Juan Cruz', notes:'All items in good condition', createdAt:'2024-05-06' },
  { id:'d2', deliveryNumber:'DEL-0002', poNumber:'PO-0003', supplier:'LED Masters', branch:'Main',  status:'partial',  deliveryDate:'2024-05-08', items:[{name:'LED H4 Bulb Set',qtyExpected:10,qtyReceived:4,condition:'Good'}], receivedBy:'Maria Santos', notes:'6 pcs backordered', createdAt:'2024-05-08' },
  { id:'d3', deliveryNumber:'DEL-0003', poNumber:'PO-0002', supplier:'Tint World',  branch:'North', status:'pending',  deliveryDate:'2024-05-12', items:[{name:'Carbon Film 35%',qtyExpected:20,qtyReceived:0,condition:''},{name:'Ceramic Film 70%',qtyExpected:10,qtyReceived:0,condition:''}], receivedBy:'', notes:'', createdAt:'2024-05-08' },
];

const EMPTY = { poNumber:'', supplier:'', branch:'Main Branch', deliveryDate:new Date().toISOString().slice(0,10), items:[{name:'',qtyExpected:1,qtyReceived:0,condition:'Good'}], receivedBy:'', notes:'' };
const f = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

export default function DeliveriesPage() {
  const { profile } = useUser();
  const [deliveries, setDeliveries] = useState([]);
  const [products, setProducts]     = useState([]);
  const [branches, setBranches]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [detail, setDetail]         = useState(null);
  const [purchaseOrders, setPOs]    = useState([]);
  const [page, setPage]             = useState(1);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  useEffect(() => {
    let alive = true;
    deliveriesAPI.getAll(profile?.branchName || profile?.branchId)
      .then(list => { if (alive) setDeliveries(list); })
      .catch(() => { if (alive) setDeliveries(MOCK); })
      .finally(() => { if (alive) setLoading(false); });

    productsAPI.getAll(profile?.branchName || profile?.branchId)
      .then(list => { if (alive) setProducts(list); })
      .catch(console.error);

    branchesAPI.getAll()
      .then(list => { if (alive) setBranches(list); })
      .catch(console.error);

    poAPI.getAll(profile?.branchName || profile?.branchId)
      .then(list => { if (alive) setPOs(list); })
      .catch(console.error);

    return () => { alive = false; };
  }, [profile?.branchName, profile?.branchId]);

  const nextNum = () => `DEL-${String(deliveries.length+1).padStart(4,'0')}`;
  const openAdd  = () => { setEditing(null); setForm({...EMPTY, deliveryDate: new Date().toISOString().slice(0,10), branch: profile?.branchName || 'Main Branch'}); setShowForm(true); };
  const openEdit = d  => { setEditing(d); setForm({...d}); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        deliveryNumber: form.deliveryNumber || nextNum(),
        supplier: form.supplier,
        poNumber: form.poNumber || undefined,
        branch: form.branch || profile?.branchName || 'Main Branch',
        deliveryDate: form.deliveryDate || new Date().toISOString().slice(0,10),
        receivedBy: form.receivedBy || undefined,
        notes: form.notes || undefined,
        items: form.items.map(i => ({
          name: i.name,
          qtyExpected: Number(i.qtyExpected) || 0,
          qtyReceived: Number(i.qtyReceived) || 0,
          condition: i.condition || 'Good',
        })),
      };

      if (editing) {
        await deliveriesAPI.update(editing.id || editing._id, payload);
      } else {
        await deliveriesAPI.add(payload);
      }
      setShowForm(false);
      const list = await deliveriesAPI.getAll(profile?.branchName || profile?.branchId);
      setDeliveries(list);
    } catch (err) {
      alert(err.message || 'Failed to save delivery.');
    } finally {
      setSaving(false);
    }
  };

  const markReceived = async (d) => {
    try {
      const updatedItems = d.items.map(i => ({
        ...i,
        qtyReceived: i.qtyExpected
      }));
      await deliveriesAPI.update(d.id || d._id, {
        status: 'received',
        items: updatedItems,
      });
      const list = await deliveriesAPI.getAll(profile?.branchName || profile?.branchId);
      setDeliveries(list);
    } catch (err) {
      alert(err.message || 'Failed to mark delivery as received.');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this delivery record?')) {
      try {
        await deliveriesAPI.delete(id);
        const list = await deliveriesAPI.getAll(profile?.branchName || profile?.branchId);
        setDeliveries(list);
      } catch (err) {
        alert(err.message || 'Failed to delete delivery.');
      }
    }
  };

  const addItem    = () => setForm(p=>({...p,items:[...p.items,{name:'',qtyExpected:1,qtyReceived:0,condition:'Good'}]}));
  const removeItem = i  => setForm(p=>({...p,items:p.items.filter((_,j)=>j!==i)}));
  const updateItem = (i,k,v) => setForm(p=>({...p,items:p.items.map((it,j)=>j===i?{...it,[k]:v}:it)}));

  const filtered = deliveries.filter(d => {
    const ms = statusFilter==='all'||d.status===statusFilter;
    const mq = !search||[d.deliveryNumber,d.supplier,d.poNumber,d.branch].some(s=>s?.toLowerCase().includes(search.toLowerCase()));
    return ms&&mq;
  });

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page-1)*ITEMS_PER_PAGE, page*ITEMS_PER_PAGE);

  const uniqueProducts = [];
  const seenProducts = new Set();
  for (const p of products) {
    const key = `${p.name?.toLowerCase().trim()}::${p.sku?.toLowerCase().trim() || ''}`;
    if (!seenProducts.has(key)) {
      seenProducts.add(key);
      uniqueProducts.push(p);
    }
  }

  const isStarter = profile?.plan === 'starter';

  const pageContent = (
    <div className="p-4 md:p-8">
      {/* Sticky Header & Filter Container */}
      <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 -mx-4 md:-mx-8 px-4 md:px-8 pt-2 pb-4 border-b border-gray-200/60 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Deliveries</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {deliveries.filter(d=>d.status==='pending').length} pending · {deliveries.filter(d=>d.status==='received').length} received
            </p>
          </div>
          <button onClick={openAdd} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
            <Plus size={17}/> Record Delivery
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          {/* Mobile Filter Row */}
          <div className="flex gap-2 w-full sm:hidden">
            <div className="bg-gray-100 p-1 rounded-xl flex flex-1">
              {[{k:'all',l:'All'},{k:'pending',l:'Pending'},{k:'received',l:'Received'}].map(ft=>(
                <button
                  key={ft.k}
                  onClick={()=>setStatus(ft.k)}
                  className={`flex-1 py-1.5 text-center rounded-lg text-xs font-semibold transition-all duration-200 ${
                    statusFilter===ft.k
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {ft.l}
                </button>
              ))}
            </div>
            
            <div className="relative flex-shrink-0">
              <select
                value={['all','pending','received'].includes(statusFilter) ? 'all' : statusFilter}
                onChange={e=>setStatus(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-xl pl-3.5 pr-8 py-2 text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer h-full"
              >
                <option value="all">More</option>
                <option value="partial">Partial</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-500">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {/* Desktop Filter Row */}
          <div className="hidden sm:flex gap-1.5">
            {['all',...Object.keys(DELIVERY_STATUSES)].map(s=>(
              <button key={s} onClick={()=>setStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter===s?'bg-orange-500 text-white':'bg-white border border-gray-300 text-gray-600 hover:border-orange-300'}`}>
                {s==='all'?'All':DELIVERY_STATUSES[s]?.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-3 sm:top-2.5 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search supplier, PO number…" className="w-full pl-9 pr-8 py-2 sm:py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"/>
            {search && <button onClick={()=>setSearch('')} className="absolute right-3 top-3 sm:top-2.5 text-gray-400"><X size={14}/></button>}
          </div>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/></div> : (
        <div>
          <div className="space-y-3">
            {filtered.length===0 ? (
              <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                <Truck size={40} className="mx-auto text-gray-300 mb-3"/>
                <p className="text-gray-500 text-sm">No deliveries found</p>
              </div>
            ) : paginated.map(d => {
              const sm = DELIVERY_STATUSES[d.status] || DELIVERY_STATUSES.pending;
              const totalExpected = d.items.reduce((s,i)=>s+i.qtyExpected,0);
              const totalReceived = d.items.reduce((s,i)=>s+(i.qtyReceived||0),0);
              return (
                <div key={d.id || d._id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:shadow-sm transition flex flex-col gap-3 cursor-pointer" onClick={()=>setDetail(d)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="hidden sm:flex h-10 w-10 rounded-xl bg-orange-100 items-center justify-center flex-shrink-0">
                        <Truck size={18} className="text-orange-600"/>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono text-gray-400">{d.deliveryNumber}</span>
                          <h3 className="font-semibold text-gray-900 text-sm truncate">{d.supplier}</h3>
                        </div>
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-lg ${sm.cls}`}>{sm.label}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 text-xs text-gray-500">
                      {d.poNumber && <div className="font-medium text-gray-900">PO: {d.poNumber}</div>}
                      <div>Date: {d.deliveryDate}</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-xs text-gray-500 border-t border-gray-100/60 pt-2.5 mt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span>Branch: {d.branch}</span>
                      {d.receivedBy && <span>Received by: {d.receivedBy}</span>}
                    </div>
                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{width:`${totalExpected>0?(totalReceived/totalExpected)*100:0}%`}}/>
                      </div>
                      <span className="text-[11px] text-gray-500 font-medium flex-shrink-0">{totalReceived}/{totalExpected} items</span>
                    </div>
                  </div>

                  {/* Items preview & actions */}
                  <div className="flex items-center justify-between gap-2 border-t border-gray-100/60 pt-2.5 mt-1">
                    <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                      {d.items.slice(0, 2).map((item,i)=>(
                        <span key={i} className="text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-lg truncate max-w-[120px]">
                          {item.name} <span className={item.qtyReceived>=item.qtyExpected?'text-emerald-600 font-semibold':'text-amber-600 font-semibold'}>{item.qtyReceived}/{item.qtyExpected}</span>
                        </span>
                      ))}
                      {d.items.length > 2 && <span className="text-[11px] text-gray-400 flex-shrink-0">+{d.items.length - 2} more</span>}
                    </div>
                    
                    <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e=>e.stopPropagation()}>
                      {d.status==='pending' && (
                        <button onClick={()=>markReceived(d)} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition shadow-sm">
                          <Check size={12}/> <span>Receive All</span>
                        </button>
                      )}
                      <button onClick={()=>openEdit(d)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition"><Edit2 size={13}/></button>
                      <button onClick={()=>handleDelete(d.id || d._id)} className="p-1.5 hover:bg-rose-50 rounded-md text-gray-400 hover:text-rose-600 transition"><Trash2 size={13}/></button>
                      <button onClick={()=>setDetail(d)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition"><ChevronRight size={15}/></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-2">
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

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={()=>setDetail(null)}>
          <div className="bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div><p className="font-bold text-gray-900">{detail.supplier}</p><p className="text-xs font-mono text-gray-400">{detail.deliveryNumber}</p></div>
              <button onClick={()=>setDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[{l:'Status',v:DELIVERY_STATUSES[detail.status]?.label},{l:'Branch',v:detail.branch},{l:'Date',v:detail.deliveryDate},{l:'Received By',v:detail.receivedBy||'—'},{l:'PO Ref',v:detail.poNumber||'—'}].map(i=>(
                  <div key={i.l} className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-0.5">{i.l}</p><p className="font-semibold text-gray-900 text-sm">{i.v}</p></div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Items Received</p>
                <div className="space-y-2">
                  {detail.items.map((item,i)=>(
                    <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <div><p className="text-sm font-medium text-gray-900">{item.name}</p><p className="text-xs text-gray-400">Condition: {item.condition||'—'}</p></div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${item.qtyReceived>=item.qtyExpected?'text-emerald-600':'text-amber-600'}`}>{item.qtyReceived}/{item.qtyExpected}</p>
                        <p className="text-xs text-gray-400">received</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {detail.notes && <div><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-sm text-gray-700">{detail.notes}</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">{editing?'Edit Delivery':'Record Delivery'}</h2>
              <button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Supplier *</label><input required type="text" value={form.supplier} onChange={e=>setForm(p=>({...p,supplier:e.target.value}))} className={f}/></div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">PO Reference *</label>
                  <select
                    required
                    value={form.poNumber}
                    onChange={e => {
                      const selectedPO = e.target.value;
                      const matched = purchaseOrders.find(o => o.poNumber === selectedPO);
                      if (matched) {
                        setForm(p => ({
                          ...p,
                          poNumber: selectedPO,
                          supplier: matched.supplier,
                          branch: matched.branch,
                          items: matched.items.map(poItem => ({
                            name: poItem.name,
                            qtyExpected: poItem.qty - (poItem.received || 0),
                            qtyReceived: poItem.qty - (poItem.received || 0),
                            condition: 'Good',
                          })),
                        }));
                      } else {
                        setForm(p => ({ ...p, poNumber: selectedPO }));
                      }
                    }}
                    className={f}
                  >
                    <option value="">Select PO…</option>
                    {purchaseOrders.filter(o => ['ordered', 'partial'].includes(o.status)).map(o => (
                      <option key={o.id || o._id} value={o.poNumber}>
                        {o.poNumber} ({o.supplier} — {o.branch})
                      </option>
                    ))}
                    {purchaseOrders.filter(o => ['ordered', 'partial'].includes(o.status)).length === 0 && (
                      <option disabled value="">No pending POs</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Branch *</label>
                  <select
                    required
                    value={form.branch}
                    onChange={e=>setForm(p=>({...p,branch:e.target.value}))}
                    className={f}
                  >
                    {branches.map(b => (
                      <option key={b.id || b._id} value={b.name}>{b.name}</option>
                    ))}
                    {branches.length === 0 && <option value="Main Branch">Main Branch</option>}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Delivery Date</label><input type="date" value={form.deliveryDate} onChange={e=>setForm(p=>({...p,deliveryDate:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Received By</label><input type="text" value={form.receivedBy} onChange={e=>setForm(p=>({...p,receivedBy:e.target.value}))} className={f}/></div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">Items *</label>
                    <button type="button" onClick={addItem} className="text-xs text-orange-500 hover:text-orange-700 font-medium flex items-center gap-1"><Plus size={13}/>Add item</button>
                  </div>
                  <div className="space-y-2">
                    {form.items.map((item,i)=>(
                      <div key={i} className="flex gap-2 items-center">
                        <div className="flex-1 relative">
                          <select
                            required
                            value={item.name}
                            onChange={e => {
                              const selectedName = e.target.value;
                              const matched = products.find(p => p.name === selectedName);
                              if (matched) {
                                updateItem(i, 'name', matched.name);
                              } else {
                                updateItem(i, 'name', selectedName);
                              }
                            }}
                            className={f.replace('w-full', '') + ' w-full'}
                          >
                            <option value="">Select product…</option>
                            {uniqueProducts.map(p => (
                              <option key={p.id || p._id} value={p.name}>
                                {p.name} (SKU: {p.sku || 'N/A'})
                              </option>
                            ))}
                          </select>
                        </div>
                        <input type="number" placeholder="Expected" min="0" value={item.qtyExpected} onChange={e=>updateItem(i,'qtyExpected',e.target.value)} className={f.replace('w-full', '') + ' w-20'}/>
                        <input type="number" placeholder="Received" min="0" value={item.qtyReceived} onChange={e=>updateItem(i,'qtyReceived',e.target.value)} className={f.replace('w-full', '') + ' w-20'}/>
                        <select value={item.condition} onChange={e=>updateItem(i,'condition',e.target.value)} className={f.replace('w-full', '') + ' w-28'}>
                          {['Good','Damaged','Incomplete','Return'].map(c=><option key={c}>{c}</option>)}
                        </select>
                        <button type="button" onClick={()=>removeItem(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0"><X size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label><textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className={f+' resize-none'}/></div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">{saving?'Saving…':editing?'Update':'Record Delivery'}</button>
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (isStarter) {
    return <UpgradeOverlay feature="Deliveries" icon={Truck}>{pageContent}</UpgradeOverlay>;
  }

  return pageContent;
}
