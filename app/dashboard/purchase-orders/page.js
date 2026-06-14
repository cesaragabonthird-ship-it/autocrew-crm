'use client';
import { useState, useEffect } from 'react';
import { poAPI, productsAPI, branchesAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import { PO_STATUSES, PRODUCT_CATEGORIES } from '@/lib/constants';
import { Plus, Search, X, ShoppingCart, Edit2, Trash2, ChevronRight, Check, Package, ChevronDown } from 'lucide-react';
import UpgradeOverlay from '@/components/UpgradeOverlay';

const MOCK_POS = [
  { id:'po1', poNumber:'PO-0001', supplier:'Pioneer PH',   branch:'Main',  status:'received', orderDate:'2024-05-01', expectedDate:'2024-05-07', receivedDate:'2024-05-06', items:[{productId:'p1',name:'Pioneer AVH-Z9200BT',qty:5,unitCost:5800,received:5}], notes:'Urgent restock', totalCost:29000 },
  { id:'po2', poNumber:'PO-0002', supplier:'Tint World',   branch:'North', status:'ordered',  orderDate:'2024-05-05', expectedDate:'2024-05-12', receivedDate:'',           items:[{productId:'p5',name:'Carbon Film 35%',qty:20,unitCost:180,received:0},{productId:'p6',name:'Ceramic Film 70%',qty:10,unitCost:280,received:0}], notes:'', totalCost:6400 },
  { id:'po3', poNumber:'PO-0003', supplier:'LED Masters',  branch:'Main',  status:'partial',  orderDate:'2024-05-03', expectedDate:'2024-05-09', receivedDate:'',           items:[{productId:'p7',name:'LED H4 Bulb Set',qty:10,unitCost:420,received:4}], notes:'Partial delivery', totalCost:4200 },
  { id:'po4', poNumber:'PO-0004', supplier:'BlackVue PH',  branch:'Main',  status:'draft',    orderDate:'2024-05-08', expectedDate:'2024-05-15', receivedDate:'',           items:[{productId:'p4',name:'BlackVue DR900X-2CH',qty:8,unitCost:3500,received:0}], notes:'', totalCost:28000 },
];

const EMPTY_FORM = { supplier:'', branch:'Main Branch', expectedDate:'', notes:'', items:[{name:'',qty:1,unitCost:''}] };
const f = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

export default function PurchaseOrdersPage() {
  const { profile } = useUser();
  const [orders, setOrders]       = useState([]);
  const [products, setProducts]   = useState([]);
  const [branches, setBranches]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [detail, setDetail]       = useState(null);
  const [showReceive, setShowReceive] = useState(null);
  const [receiveQtys, setReceiveQtys] = useState({});
  const [page, setPage]           = useState(1);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  useEffect(() => {
    let alive = true;
    poAPI.getAll(profile?.branchName || profile?.branchId)
      .then(list => { if (alive) setOrders(list); })
      .catch(() => { if (alive) setOrders(MOCK_POS); })
      .finally(() => { if (alive) setLoading(false); });

    productsAPI.getAll(profile?.branchName || profile?.branchId)
      .then(list => { if (alive) setProducts(list); })
      .catch(console.error);

    branchesAPI.getAll()
      .then(list => { if (alive) setBranches(list); })
      .catch(console.error);

    return () => { alive = false; };
  }, [profile?.branchName, profile?.branchId]);

  const nextPONum = () => `PO-${String(orders.length+1).padStart(4,'0')}`;

  const openAdd  = () => { setEditing(null); setForm({ ...EMPTY_FORM, orderDate: new Date().toISOString().slice(0,10), branch: profile?.branchName || 'Main Branch' }); setShowForm(true); };
  const openEdit = o  => { setEditing(o); setForm({...o}); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const total = form.items.reduce((s,i) => s + (+i.qty||0)*(+i.unitCost||0), 0);
      const payload = {
        poNumber: form.poNumber || nextPONum(),
        supplier: form.supplier,
        branch: form.branch || profile?.branchName || 'Main Branch',
        orderDate: form.orderDate || new Date().toISOString().slice(0,10),
        expectedDate: form.expectedDate || undefined,
        totalCost: total,
        notes: form.notes || undefined,
        items: form.items.map(i => ({
          name: i.name,
          qty: Number(i.qty) || 0,
          unitCost: Number(i.unitCost) || 0,
          received: Number(i.received) || 0,
          sku: i.sku || undefined,
        })),
      };

      if (editing) {
        await poAPI.update(editing.id || editing._id, payload);
      } else {
        await poAPI.add(payload);
      }
      setShowForm(false);
      const list = await poAPI.getAll(profile?.branchName || profile?.branchId);
      setOrders(list);
    } catch (err) {
      alert(err.message || 'Failed to save purchase order.');
    } finally {
      setSaving(false);
    }
  };

  const sendOrder = async (id) => {
    try {
      await poAPI.update(id, { status: 'ordered' });
      const list = await poAPI.getAll(profile?.branchName || profile?.branchId);
      setOrders(list);
    } catch (err) {
      alert(err.message || 'Failed to send purchase order.');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this PO?')) {
      try {
        await poAPI.delete(id);
        const list = await poAPI.getAll(profile?.branchName || profile?.branchId);
        setOrders(list);
      } catch (err) {
        alert(err.message || 'Failed to delete purchase order.');
      }
    }
  };

  const openReceive = o => {
    const qtys = {};
    o.items.forEach((item,i) => { qtys[i] = o.items[i].qty - (o.items[i].received||0); });
    setReceiveQtys(qtys);
    setShowReceive(o);
  };

  const confirmReceive = async () => {
    if (!showReceive) return;
    try {
      const qtys = showReceive.items.map((_, i) => Number(receiveQtys[i]) || 0);
      await poAPI.receive(showReceive.id || showReceive._id, { receivedQtys: qtys });
      setShowReceive(null);
      const list = await poAPI.getAll(profile?.branchName || profile?.branchId);
      setOrders(list);
    } catch (err) {
      alert(err.message || 'Failed to receive purchase order delivery.');
    }
  };

  const addItem    = () => setForm(p => ({ ...p, items: [...p.items, {name:'',qty:1,unitCost:''}] }));
  const removeItem = i  => setForm(p => ({ ...p, items: p.items.filter((_,j)=>j!==i) }));
  const updateItem = (i,k,v) => setForm(p => ({ ...p, items: p.items.map((it,j) => j===i?{...it,[k]:v}:it) }));

  const filtered = orders.filter(o => {
    const ms = statusFilter==='all'||o.status===statusFilter;
    const mq = !search||[o.poNumber,o.supplier,o.branch].some(s=>s?.toLowerCase().includes(search.toLowerCase()));
    return ms&&mq;
  });

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page-1)*ITEMS_PER_PAGE, page*ITEMS_PER_PAGE);

  const totalOrdered  = orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+o.totalCost,0);
  const pendingValue  = orders.filter(o=>['ordered','partial'].includes(o.status)).reduce((s,o)=>s+o.totalCost,0);

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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Purchase Orders</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {orders.length} orders · <span className="text-gray-700 font-medium">₱{pendingValue.toLocaleString()} pending delivery</span>
            </p>
          </div>
          <button onClick={openAdd} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
            <Plus size={17}/> New PO
          </button>
        </div>

        {/* Filters (Segmented Control + Filter Dropdown) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          {/* Mobile Filter Row */}
          <div className="flex gap-2 w-full sm:hidden">
            <div className="bg-gray-100 p-1 rounded-xl flex flex-1">
              {[{k:'all',l:'All'},{k:'ordered',l:'Ordered'},{k:'received',l:'Received'}].map(ft=>(
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
                value={['all','ordered','received'].includes(statusFilter) ? 'all' : statusFilter}
                onChange={e=>setStatus(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-xl pl-3.5 pr-8 py-2 text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer h-full"
              >
                <option value="all">More</option>
                <option value="draft">Draft</option>
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
            {['all',...Object.keys(PO_STATUSES)].map(s => (
              <button key={s} onClick={()=>setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${statusFilter===s?'bg-orange-500 text-white':'bg-white border border-gray-300 text-gray-600 hover:border-orange-300'}`}>
                {s==='all'?'All':PO_STATUSES[s]?.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-3 sm:top-2.5 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search PO number, supplier…"
              className="w-full pl-9 pr-8 py-2 sm:py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"/>
            {search && <button onClick={()=>setSearch('')} className="absolute right-3 top-3 sm:top-2.5 text-gray-400"><X size={14}/></button>}
          </div>
        </div>
      </div>

      {/* PO Cards */}
      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/></div> : (
        <div>
          <div className="space-y-3">
            {filtered.length===0 ? (
              <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                <ShoppingCart size={40} className="mx-auto text-gray-300 mb-3"/>
                <p className="text-gray-500 text-sm">No purchase orders found</p>
                <button onClick={openAdd} className="mt-3 text-orange-500 text-sm font-medium hover:underline">Create one</button>
              </div>
            ) : paginated.map(o => {
              const sm = PO_STATUSES[o.status] || PO_STATUSES.draft;
              return (
                <div key={o.id || o._id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:shadow-sm transition flex flex-col gap-3 cursor-pointer" onClick={()=>setDetail(o)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-gray-400">{o.poNumber}</span>
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{o.supplier}</h3>
                      </div>
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-lg ${sm.cls}`}>{sm.label}</span>
                    </div>
                    
                    <div className="text-right flex-shrink-0 flex flex-col items-end">
                      <span className="font-bold text-gray-900 text-sm sm:text-base">₱{o.totalCost.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs text-gray-500 border-t border-gray-100/60 pt-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span>Branch: {o.branch}</span>
                      <span>Ordered: {o.orderDate}</span>
                    </div>
                    {o.receivedDate && (
                      <div className="text-emerald-600 font-medium">Received: {o.receivedDate}</div>
                    )}
                  </div>

                  {/* Items preview & actions */}
                  <div className="flex items-center justify-between gap-2 border-t border-gray-100/60 pt-2.5 mt-0.5">
                    <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                      {o.items.slice(0,2).map((item,i) => (
                        <span key={i} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg truncate max-w-[120px]">
                          {item.name} ×{item.qty}
                          {item.received>0 && <span className="text-emerald-600 font-medium"> ({item.received} rcvd)</span>}
                        </span>
                      ))}
                      {o.items.length>2 && <span className="text-xs text-gray-400 flex-shrink-0">+{o.items.length-2} more</span>}
                    </div>
                    
                    <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>openEdit(o)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition"><Edit2 size={13}/></button>
                      <button onClick={()=>handleDelete(o.id || o._id)} className="p-1.5 hover:bg-rose-50 rounded-md text-gray-400 hover:text-rose-600 transition"><Trash2 size={13}/></button>
                      <button onClick={()=>setDetail(o)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition"><ChevronRight size={15}/></button>
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
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div><p className="font-bold text-gray-900">{detail.supplier}</p><p className="text-xs font-mono text-gray-400">{detail.poNumber}</p></div>
              <button onClick={()=>setDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Status</p>
                  <p className="font-semibold text-gray-900 text-sm">{PO_STATUSES[detail.status]?.label}</p>
                  {detail.receivedDate && (detail.status === 'received' || detail.status === 'partial') && (
                    <p className="text-xs text-gray-400 mt-0.5">{detail.receivedDate}</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Branch</p>
                  <p className="font-semibold text-gray-900 text-sm">{detail.branch}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Order Date</p>
                  <p className="font-semibold text-gray-900 text-sm">{detail.orderDate}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Items</p>
                <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm min-w-[360px]">
                    <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="px-3 py-2 text-left text-xs text-gray-500">Product</th><th className="px-3 py-2 text-right text-xs text-gray-500">Ordered</th><th className="px-3 py-2 text-right text-xs text-gray-500">Received</th><th className="px-3 py-2 text-right text-xs text-gray-500">Total</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.items.map((item,i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-800">{item.name}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{item.qty}</td>
                          <td className="px-3 py-2 text-right font-medium text-emerald-600">{item.received||0}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">₱{(item.qty*item.unitCost).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                <span>Total Cost</span><span>₱{detail.totalCost.toLocaleString()}</span>
              </div>
              {detail.notes && <div><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-sm text-gray-700">{detail.notes}</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* Receive modal */}
      {showReceive && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowReceive(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">Receive Delivery</h2>
              <button onClick={()=>setShowReceive(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <p className="text-sm text-gray-600 mb-4"><strong>{showReceive.supplier}</strong> — {showReceive.poNumber}</p>
            <div className="space-y-3 mb-5">
              {showReceive.items.map((item,i) => {
                const pending = item.qty - (item.received||0);
                return (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">Ordered: {item.qty} · Received: {item.received||0} · Pending: {pending}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Receive:</span>
                      <input type="number" min="0" max={pending} value={receiveQtys[i]||0}
                        onChange={e=>setReceiveQtys(q=>({...q,[i]:e.target.value}))}
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-500"/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-4">
              Receiving stock will automatically update inventory levels.
            </div>
            <div className="flex gap-3">
              <button onClick={confirmReceive} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 rounded-xl transition">
                <Check size={15}/> Confirm Receipt
              </button>
              <button onClick={()=>setShowReceive(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">{editing?'Edit PO':'New Purchase Order'}</h2>
              <button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Supplier *</label><input required type="text" value={form.supplier} onChange={e=>setForm(p=>({...p,supplier:e.target.value}))} className={f}/></div>
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
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Order Date</label><input type="date" value={form.orderDate||''} onChange={e=>setForm(p=>({...p,orderDate:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">PO Number (Auto-generated)</label><input readOnly type="text" value={form.poNumber || nextPONum()} className={f + " bg-gray-50 cursor-not-allowed"}/></div>
                {/* Items */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">Items *</label>
                    <button type="button" onClick={addItem} className="text-xs text-orange-500 hover:text-orange-700 font-medium flex items-center gap-1"><Plus size={13}/>Add item</button>
                  </div>
                  <div className="space-y-2">
                    {form.items.map((item,i) => (
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
                                updateItem(i, 'unitCost', matched.costPrice);
                                updateItem(i, 'sku', matched.sku);
                              } else {
                                updateItem(i, 'name', selectedName);
                                updateItem(i, 'unitCost', '');
                                updateItem(i, 'sku', '');
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
                        <input type="number" placeholder="Qty" min="1" value={item.qty} onChange={e=>updateItem(i,'qty',e.target.value)} className={f.replace('w-full', '') + ' w-16'}/>
                        <input type="number" placeholder="Cost ₱" min="0" value={item.unitCost} onChange={e=>updateItem(i,'unitCost',e.target.value)} className={f.replace('w-full', '') + ' w-24'}/>
                        <button type="button" onClick={()=>removeItem(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0"><X size={16}/></button>
                      </div>
                    ))}
                  </div>
                  {form.items.some(i=>i.unitCost) && (
                    <div className="mt-2 bg-gray-50 rounded-lg p-2.5 text-xs text-gray-700">
                      Total: <strong>₱{form.items.reduce((s,i)=>s+(+i.qty||0)*(+i.unitCost||0),0).toLocaleString()}</strong>
                    </div>
                  )}
                </div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label><textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className={f+' resize-none'}/></div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">{saving?'Saving…':editing?'Update PO':'Create PO'}</button>
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (isStarter) {
    return <UpgradeOverlay feature="Purchase Orders" icon={ShoppingCart}>{pageContent}</UpgradeOverlay>;
  }

  return pageContent;
}
