'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { productsAPI, branchesAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import { PRODUCT_CATEGORIES } from '@/lib/constants';
import { Plus, Search, X, Package, Edit2, Trash2, AlertTriangle, ArrowLeftRight, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';

const MOCK = [
  { id:'p1', sku:'AU-001', name:'Pioneer AVH-Z9200BT',    category:'Audio & Entertainment',   branch:'Main',  costPrice:5800, sellingPrice:8000, stock:14, reorderLevel:5,  supplier:'Pioneer PH',  unit:'pcs'  },
  { id:'p2', sku:'AU-002', name:'JVC KW-M750BT',          category:'Audio & Entertainment',   branch:'Main',  costPrice:3200, sellingPrice:4500, stock:8,  reorderLevel:5,  supplier:'JVC PH',       unit:'pcs'  },
  { id:'p3', sku:'SC-001', name:'Viper 5906V Alarm',      category:'Car Alarms & Security',   branch:'Main',  costPrice:2800, sellingPrice:4000, stock:3,  reorderLevel:5,  supplier:'Viper Depot',  unit:'pcs'  },
  { id:'p4', sku:'DC-001', name:'BlackVue DR900X-2CH',    category:'Dash Cameras',            branch:'Main',  costPrice:3500, sellingPrice:4500, stock:11, reorderLevel:4,  supplier:'BlackVue PH',  unit:'pcs'  },
  { id:'p5', sku:'TF-001', name:'Carbon Film 35% (1m)',   category:'Tints & Films',           branch:'North', costPrice:180,  sellingPrice:350,  stock:48, reorderLevel:20, supplier:'Tint World',   unit:'roll' },
  { id:'p6', sku:'LT-001', name:'LED H4 Bulb Set',        category:'Lighting (LED/HID)',      branch:'Main',  costPrice:420,  sellingPrice:680,  stock:2,  reorderLevel:8,  supplier:'LED Masters',  unit:'set'  },
  { id:'p7', sku:'GP-001', name:'Garmin GPS 65s',         category:'GPS & Tracking',          branch:'Main',  costPrice:6200, sellingPrice:8500, stock:5,  reorderLevel:3,  supplier:'Garmin PH',    unit:'pcs'  },
  { id:'p8', sku:'PS-001', name:'Pyle Cam+Sensor Set',    category:'Parking Sensors & Cameras',branch:'Main', costPrice:1800, sellingPrice:2800, stock:9,  reorderLevel:5,  supplier:'Pyle Dist',    unit:'set'  },
];
const EMPTY = { sku:'', name:'', category:'', branch:'Main Branch', costPrice:'', sellingPrice:'', stock:'', reorderLevel:'', supplier:'', unit:'pcs' };
const f = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

export default function InventoryPage() {
  const { profile } = useUser();
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [catFilter, setCat]     = useState('all');
  const [stockFilter, setStock] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [detail, setDetail]     = useState(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState({ productId:'', fromBranch:'', toBranch:'', qty:'' });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    productsAPI.getAll(profile?.branchName || profile?.branchId).then(setProducts).catch(()=>setProducts(MOCK)).finally(()=>setLoading(false));
    branchesAPI.getAll().then(setBranches).catch(() => []);
  }, [profile?.branchName, profile?.branchId]);

  const openAdd  = ()  => { setEditing(null); setForm({...EMPTY, branch: profile?.branchName || 'Main Branch'}); setErrorMsg(''); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({...p}); setErrorMsg(''); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        sku: form.sku,
        name: form.name,
        category: form.category,
        branch: form.branch || profile?.branchName || 'Main Branch',
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        stock: Number(form.stock) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
        supplier: form.supplier || undefined,
        unit: form.unit || 'pcs',
        description: form.description || undefined,
      };

      if (editing) {
        await productsAPI.update(editing.id || editing._id, payload);
      } else {
        await productsAPI.add(payload);
      }
      setShowForm(false);
      const list = await productsAPI.getAll(profile?.branchName || profile?.branchId);
      setProducts(list);
    } catch (err) {
      console.warn('Save product failed:', err);
      const cleanMsg = err.message?.match(/Uncaught Error:\s*(.*)/)?.[1] || err.message || 'Failed to save product.';
      setErrorMsg(cleanMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this product?')) {
      try {
        await productsAPI.delete(id);
        const list = await productsAPI.getAll(profile?.branchName || profile?.branchId);
        setProducts(list);
      } catch (err) {
        alert(err.message || 'Failed to delete product.');
      }
    }
  };

  const handleTransfer = async () => {
    if (!transferForm.productId || !transferForm.qty) return;
    try {
      await productsAPI.transfer({
        productId: transferForm.productId,
        fromBranch: transferForm.fromBranch || 'Main Branch',
        toBranch: transferForm.toBranch || 'North Branch',
        qty: Number(transferForm.qty) || 0,
        notes: '',
      });
      setShowTransfer(false);
      setTransferForm({productId:'',fromBranch:'',toBranch:'',qty:''});
      const list = await productsAPI.getAll(profile?.branchName || profile?.branchId);
      setProducts(list);
    } catch (err) {
      alert(err.message || 'Failed to transfer stock.');
    }
  };

  const filtered = products.filter(p => {
    const mc = catFilter==='all'||p.category===catFilter;
    const ms = stockFilter==='all'||(stockFilter==='low'&&p.stock>0&&p.stock<=p.reorderLevel)||(stockFilter==='out'&&p.stock===0);
    const mq = !search||[p.name,p.sku,p.category,p.supplier].some(s=>s?.toLowerCase().includes(search.toLowerCase()));
    return mc&&ms&&mq;
  });

  const lowCount  = products.filter(p=>p.stock>0&&p.stock<=p.reorderLevel).length;
  const outCount  = products.filter(p=>p.stock===0).length;
  const totalVal  = products.reduce((s,p)=>s+p.stock*p.costPrice,0);

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 mt-1 text-sm">{products.length} products · ₱{totalVal.toLocaleString()} stock value{lowCount>0&&<span className="text-red-500 font-medium"> · {lowCount} low stock</span>}</p>
        </div>
        <div className="flex gap-2">
          {profile?.plan === 'starter' ? (
            <div className="relative group">
              <button
                disabled
                className="flex items-center gap-2 border border-gray-200 text-gray-400 opacity-50 text-sm font-medium px-3 py-2.5 rounded-lg cursor-not-allowed select-none"
              >
                <ArrowLeftRight size={15}/> Transfer
              </button>
              
              {/* Instant Tooltip */}
              <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 hidden group-hover:flex items-center bg-[#1f2937] border border-white/10 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                Multi-branch stock transfers require the Growth and Pro plans
                {/* Triangle Arrow */}
                <div className="absolute bottom-full border-4 border-transparent border-b-[#1f2937] left-1/2 -translate-x-1/2" />
              </div>
            </div>
          ) : (
            <button onClick={()=>setShowTransfer(true)} className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:border-gray-400 text-sm font-medium px-3 py-2.5 rounded-lg transition"><ArrowLeftRight size={15}/> Transfer</button>
          )}
          <button onClick={openAdd} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"><Plus size={17}/> Add Product</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[{k:'all',l:'All'},{k:'low',l:`Low Stock (${lowCount})`},{k:'out',l:`Out of Stock (${outCount})`}].map(ft=>(
          <button key={ft.k} onClick={()=>setStock(ft.k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${stockFilter===ft.k?'bg-orange-500 text-white':'bg-white border border-gray-300 text-gray-600 hover:border-orange-300'}`}>{ft.l}</button>
        ))}
        <select value={catFilter} onChange={e=>setCat(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-600 focus:outline-none bg-white">
          <option value="all">All Categories</option>
          {PRODUCT_CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search SKU, name, supplier…" className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"/>
          {search && <button onClick={()=>setSearch('')} className="absolute right-3 top-2.5 text-gray-400"><X size={14}/></button>}
        </div>
      </div>

      {/* Auto-Reorder rules teaser (Growth & Pro only) */}
      {profile && ['growth', 'pro'].includes(profile.plan) && (
        <div className="mb-4 bg-orange-50/50 border border-orange-200/50 rounded-xl px-4 py-3 flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2">
            <RefreshCw size={14} className="text-orange-500 flex-shrink-0" />
            <div className="text-gray-600">
              <span className="font-bold text-gray-800">Auto-Draft Purchase Orders</span> is coming soon. The system will automatically create draft purchase orders when products drop below their safe-stock limits.
            </div>
          </div>
          <span className="font-bold text-orange-600 uppercase text-[9px] bg-orange-100 px-1.5 py-0.5 rounded flex-shrink-0">Future Update</span>
        </div>
      )}

      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/></div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filtered.length===0 ? (
            <div className="py-16 text-center"><Package size={40} className="mx-auto text-gray-300 mb-3"/><p className="text-gray-500 text-sm">No products found</p><button onClick={openAdd} className="mt-3 text-orange-500 text-sm font-medium hover:underline">Add one</button></div>
          ) : (
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-200">{['SKU','Product','Category','Branch','Stock','Cost','Selling',''].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p=>{
                  const low=p.stock>0&&p.stock<=p.reorderLevel, out=p.stock===0;
                  const margin=p.sellingPrice>0?Math.round(((p.sellingPrice-p.costPrice)/p.sellingPrice)*100):0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={()=>setDetail(p)}>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{p.sku}</td>
                      <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{p.name}</p><p className="text-xs text-gray-400">{p.supplier}</p></td>
                      <td className="px-4 py-3 text-xs text-gray-600">{p.category}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{p.branch}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5"><span className={`text-sm font-bold ${out?'text-red-600':low?'text-amber-600':'text-gray-900'}`}>{p.stock} {p.unit}</span>{(low||out)&&<AlertTriangle size={12} className={out?'text-red-500':'text-amber-500'}/>}</div>
                        <p className="text-xs text-gray-400">Min: {p.reorderLevel}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">₱{p.costPrice.toLocaleString()}</td>
                      <td className="px-4 py-3"><p className="text-sm font-semibold text-gray-900">₱{p.sellingPrice.toLocaleString()}</p><p className="text-xs text-emerald-600">{margin}%</p></td>
                      <td className="px-4 py-3" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={()=>openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition"><Edit2 size={14}/></button>
                          <button onClick={()=>handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-600 transition"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={()=>setDetail(null)}>
          <div className="bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div><p className="font-bold text-gray-900">{detail.name}</p><p className="text-xs font-mono text-gray-400">{detail.sku}</p></div>
              <button onClick={()=>setDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[{l:'Category',v:detail.category},{l:'Branch',v:detail.branch},{l:'Supplier',v:detail.supplier},{l:'Unit',v:detail.unit},{l:'Stock',v:`${detail.stock} ${detail.unit}`},{l:'Reorder At',v:`${detail.reorderLevel} ${detail.unit}`},{l:'Cost Price',v:`₱${detail.costPrice.toLocaleString()}`},{l:'Sell Price',v:`₱${detail.sellingPrice.toLocaleString()}`}].map(i=>(
                  <div key={i.l} className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-0.5">{i.l}</p><p className="font-semibold text-gray-900 text-sm">{i.v}</p></div>
                ))}
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs text-emerald-600 font-medium mb-1">Gross Margin</p>
                <p className="text-2xl font-bold text-emerald-700">{detail.sellingPrice>0?Math.round(((detail.sellingPrice-detail.costPrice)/detail.sellingPrice)*100):0}%</p>
                <p className="text-xs text-emerald-600 mt-0.5">₱{(detail.sellingPrice-detail.costPrice).toLocaleString()} per unit</p>
              </div>
              <button onClick={()=>{setDetail(null);openEdit(detail);}} className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 rounded-xl transition">Edit Product</button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6 max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">{editing?'Edit Product':'Add Product'}</h2>
              <button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            
            {errorMsg && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl flex items-start gap-2.5 shadow-sm text-xs text-left">
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
                <div><label className="block text-xs font-medium text-gray-600 mb-1">SKU *</label><input required type="text" value={form.sku} onChange={e=>setForm(p=>({...p,sku:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Unit</label><select value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))} className={f}>{['pcs','set','roll','m','box','pack','litre','other'].map(u=><option key={u}>{u}</option>)}</select></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label><input required type="text" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Category</label><select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} className={f}><option value="">Select…</option>{PRODUCT_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
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
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label><input type="text" value={form.supplier} onChange={e=>setForm(p=>({...p,supplier:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Cost Price (₱) *</label><input required type="number" min="0" value={form.costPrice} onChange={e=>setForm(p=>({...p,costPrice:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Selling Price (₱) *</label><input required type="number" min="0" value={form.sellingPrice} onChange={e=>setForm(p=>({...p,sellingPrice:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Current Stock</label><input type="number" min="0" value={form.stock} onChange={e=>setForm(p=>({...p,stock:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Reorder Level</label><input type="number" min="0" value={form.reorderLevel} onChange={e=>setForm(p=>({...p,reorderLevel:e.target.value}))} className={f}/></div>
                {form.costPrice && form.sellingPrice && +form.sellingPrice > 0 && (
                  <div className="col-span-2 bg-emerald-50 rounded-lg p-3 text-xs text-emerald-700">
                    Margin: <strong>{Math.round(((+form.sellingPrice-+form.costPrice)/+form.sellingPrice)*100)}%</strong> · ₱{(+form.sellingPrice-+form.costPrice).toLocaleString()} per unit
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">{saving?'Saving…':editing?'Update':'Add Product'}</button>
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowTransfer(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-gray-900">Transfer Stock</h2><button onClick={()=>setShowTransfer(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Product</label><select value={transferForm.productId} onChange={e=>{
                const pid = e.target.value;
                const p = products.find(prod => (prod.id || prod._id) === pid);
                setTransferForm(prev=>({...prev, productId:pid, fromBranch: p ? p.branch : ''}));
              }} className={f}><option value="">Select…</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.stock} {p.unit} — {p.branch})</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From Branch</label>
                  <select
                    value={transferForm.fromBranch}
                    onChange={e=>setTransferForm(p=>({...p,fromBranch:e.target.value}))}
                    className={f}
                  >
                    <option value="">Select…</option>
                    {branches.map(b => (
                      <option key={b.id || b._id} value={b.name}>{b.name}</option>
                    ))}
                    {branches.length === 0 && <option value="Main Branch">Main Branch</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To Branch</label>
                  <select
                    value={transferForm.toBranch}
                    onChange={e=>setTransferForm(p=>({...p,toBranch:e.target.value}))}
                    className={f}
                  >
                    <option value="">Select…</option>
                    {branches.map(b => (
                      <option key={b.id || b._id} value={b.name}>{b.name}</option>
                    ))}
                    {branches.length === 0 && <option value="Main Branch">Main Branch</option>}
                  </select>
                </div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label><input type="number" min="1" value={transferForm.qty} onChange={e=>setTransferForm(p=>({...p,qty:e.target.value}))} className={f}/></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleTransfer} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition">Confirm Transfer</button>
              <button onClick={()=>setShowTransfer(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
