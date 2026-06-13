'use client';
import { useState, useEffect } from 'react';
import { quotesAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import { JOB_TYPES, PAYMENT_METHODS } from '@/lib/constants';
import { Plus, Search, X, FileText, Edit2, Trash2, ChevronRight, Copy, Send, CheckCircle2, ArrowRight } from 'lucide-react';

const STATUS_META = {
  draft:    { label:'Draft',     cls:'bg-gray-100 text-gray-600'      },
  sent:     { label:'Sent',      cls:'bg-blue-100 text-blue-700'      },
  accepted: { label:'Accepted',  cls:'bg-emerald-100 text-emerald-700' },
  declined: { label:'Declined',  cls:'bg-red-100 text-red-600'        },
  expired:  { label:'Expired',   cls:'bg-amber-100 text-amber-700'    },
};

const MOCK = [
  { id:'q1', quoteNumber:'QT-0001', customer:'Carlos Reyes',   phone:'09171234567', vehicle:'2022 Toyota Hilux',    type:'Audio Installation',   status:'sent',     validUntil:'2024-05-20', createdAt:'2024-05-05', items:[{desc:'Pioneer AVH-Z9200BT',qty:1,price:8000},{desc:'Speaker Set Pioneer',qty:1,price:2500},{desc:'Installation Labor',qty:1,price:2000}], discount:0, notes:'Includes 1 year warranty on unit.' },
  { id:'q2', quoteNumber:'QT-0002', customer:'Juan Dela Cruz', phone:'09191234569', vehicle:'2023 Ford Ranger',     type:'Alarm Installation',   status:'accepted', validUntil:'2024-05-18', createdAt:'2024-05-03', items:[{desc:'Viper 5906V Alarm',qty:1,price:4000},{desc:'Installation Labor',qty:1,price:3800}], discount:500, notes:'VIP client discount applied.' },
  { id:'q3', quoteNumber:'QT-0003', customer:'Roberto Lim',    phone:'09211234571', vehicle:'2022 Suzuki Jimny',    type:'GPS Tracker Installation',status:'draft',   validUntil:'2024-05-25', createdAt:'2024-05-08', items:[{desc:'Garmin GPS 65s',qty:1,price:8500},{desc:'Hidden Install Labor',qty:1,price:1000}], discount:0, notes:'' },
  { id:'q4', quoteNumber:'QT-0004', customer:'Maria Santos',   phone:'09181234568', vehicle:'2021 Honda City',      type:'Window Tinting',       status:'accepted', validUntil:'2024-05-15', createdAt:'2024-05-01', items:[{desc:'Carbon Film 35% Full Car',qty:5,price:350},{desc:'Tinting Labor',qty:1,price:4750}], discount:0, notes:'Full car tint package.' },
];

const EMPTY = { customer:'', phone:'', vehicle:'', type:'', validUntil:'', notes:'', discount:'0', items:[{desc:'',qty:1,price:''}] };
const f = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

function calcTotal(items, discount) {
  const sub = (items||[]).reduce((s,i)=>s+(+i.qty||0)*(+i.price||0),0);
  return { subtotal: sub, total: sub - (+discount||0) };
}

export default function QuotationsPage() {
  const { profile } = useUser();
  const [quotes, setQuotes]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [detail, setDetail]       = useState(null);

  const refetch = async () => {
    try {
      const list = await quotesAPI.getAll(profile?.branchName || profile?.branchId);
      setQuotes(list);
    } catch (_) {}
  };

  useEffect(() => {
    quotesAPI.getAll(profile?.branchName || profile?.branchId).then(setQuotes).catch(()=>setQuotes(MOCK)).finally(()=>setLoading(false));
  }, [profile?.branchName, profile?.branchId]);

  const nextNum = () => `QT-${String(quotes.length+1).padStart(4,'0')}`;
  const openAdd  = () => { setEditing(null); setForm({...EMPTY, branch: profile?.branchName || 'Main Branch', validUntil: new Date(Date.now()+14*864e5).toISOString().slice(0,10)}); setShowForm(true); };
  const openEdit = q  => { setEditing(q); setForm({...q}); setShowForm(true); };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        quoteNumber: editing ? editing.quoteNumber : nextNum(),
        customer: form.customer,
        phone: form.phone || undefined,
        vehicle: form.vehicle || undefined,
        type: form.type || "General",
        validUntil: form.validUntil,
        items: form.items.map(i=>({ desc: i.desc, qty: +i.qty || 1, price: +i.price || 0 })),
        discount: +form.discount || 0,
        notes: form.notes || undefined,
        branch: form.branch || profile?.branchName || 'Main Branch',
      };
      if (editing) {
        await quotesAPI.update(editing.id, {
          validUntil: payload.validUntil,
          items: payload.items,
          discount: payload.discount,
          notes: payload.notes,
        });
      } else {
        await quotesAPI.add(payload);
      }
      await refetch();
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save quotation.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete     = async id  => {
    if (!confirm('Delete this quote?')) return;
    try {
      await quotesAPI.delete(id);
      await refetch();
    } catch (err) {
      console.error(err);
      alert("Failed to delete quote.");
    }
  };

  const handleStatus     = async (id,status) => {
    try {
      await quotesAPI.update(id, { status });
      await refetch();
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    }
  };

  const handleDuplicate  = async q   => {
    try {
      await quotesAPI.add({
        quoteNumber: nextNum(),
        customer: q.customer,
        phone: q.phone || undefined,
        vehicle: q.vehicle || undefined,
        type: q.type || "General",
        validUntil: q.validUntil,
        items: q.items,
        discount: q.discount || 0,
        notes: q.notes || undefined,
        branch: q.branch || profile?.branchName || 'Main Branch',
      });
      await refetch();
    } catch (err) {
      console.error(err);
      alert("Failed to duplicate quote.");
    }
  };

  const handleConvert    = async q   => {
    const joNo = `JO-${Date.now().toString().slice(-4)}`;
    try {
      await quotesAPI.convert(q.id, joNo);
      alert(`Successfully converted ${q.quoteNumber} to Job Order ${joNo}!`);
      await refetch();
    } catch (err) {
      console.error(err);
      alert("Failed to convert quote to Job Order.");
    }
  };

  const addLine    = () => setForm(p=>({...p,items:[...p.items,{desc:'',qty:1,price:''}]}));
  const removeLine = i  => setForm(p=>({...p,items:p.items.filter((_,j)=>j!==i)}));
  const updateLine = (i,k,v) => setForm(p=>({...p,items:p.items.map((l,j)=>j===i?{...l,[k]:v}:l)}));

  const filtered = quotes.filter(q=>{
    const ms = statusFilter==='all'||q.status===statusFilter;
    const mq = !search||[q.quoteNumber,q.customer,q.vehicle,q.type].some(s=>s?.toLowerCase().includes(search.toLowerCase()));
    return ms&&mq;
  });

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {quotes.filter(q=>q.status==='accepted').length} accepted · {quotes.filter(q=>q.status==='sent').length} awaiting response
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
          <Plus size={17}/> New Quote
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex gap-1.5 flex-wrap">
          {['all',...Object.keys(STATUS_META)].map(s=>(
            <button key={s} onClick={()=>setStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter===s?'bg-orange-500 text-white':'bg-white border border-gray-300 text-gray-600 hover:border-orange-300'}`}>
              {s==='all'?'All':STATUS_META[s]?.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-44">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer, vehicle, type…" className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"/>
          {search && <button onClick={()=>setSearch('')} className="absolute right-3 top-2.5 text-gray-400"><X size={14}/></button>}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/></div> : (
        <div className="space-y-3">
          {filtered.length===0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-16 text-center"><FileText size={40} className="mx-auto text-gray-300 mb-3"/><p className="text-gray-500 text-sm">No quotations found</p></div>
          ) : filtered.map(q=>{
            const {subtotal,total} = calcTotal(q.items,q.discount);
            const sm = STATUS_META[q.status]||STATUS_META.draft;
            return (
              <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{q.quoteNumber}</span>
                      <h3 className="font-semibold text-gray-900 text-sm">{q.customer}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span>
                      <span className="ml-auto font-bold text-gray-900">₱{total.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 text-xs text-gray-500">
                      <span>{q.vehicle}</span><span>{q.type}</span>
                      <span>Valid until: {q.validUntil}</span>
                      <span>Created: {q.createdAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {q.status==='accepted' && (
                      <button onClick={()=>handleConvert(q)} className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium transition">
                        <ArrowRight size={13}/> Convert to JO
                      </button>
                    )}
                    {q.status==='draft' && (
                      <button onClick={()=>handleStatus(q.id,'sent')} className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition">
                        <Send size={13}/> Mark Sent
                      </button>
                    )}
                    {q.status==='sent' && (
                      <button onClick={()=>handleStatus(q.id,'accepted')} className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium transition">
                        <CheckCircle2 size={13}/> Accept
                      </button>
                    )}
                    <button onClick={()=>handleDuplicate(q)} title="Duplicate" className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700"><Copy size={14}/></button>
                    <button onClick={()=>setDetail(q)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700"><ChevronRight size={16}/></button>
                    <button onClick={()=>openEdit(q)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700"><Edit2 size={14}/></button>
                    <button onClick={()=>handleDelete(q.id)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      {detail && (()=>{
        const {subtotal,total} = calcTotal(detail.items,detail.discount);
        const sm = STATUS_META[detail.status]||STATUS_META.draft;
        return (
          <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={()=>setDetail(null)}>
            <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div><p className="font-bold text-gray-900">{detail.customer}</p><p className="text-xs font-mono text-gray-400">{detail.quoteNumber}</p></div>
                <div className="flex items-center gap-2"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span><button onClick={()=>setDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  {[{l:'Vehicle',v:detail.vehicle},{l:'Job Type',v:detail.type},{l:'Valid Until',v:detail.validUntil},{l:'Created',v:detail.createdAt}].map(i=>(
                    <div key={i.l} className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-0.5">{i.l}</p><p className="font-semibold text-gray-900 text-sm">{i.v}</p></div>
                  ))}
                </div>
                {detail.notes && <div><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-sm text-gray-700">{detail.notes}</p></div>}
                <div>
                  <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Line Items</p>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-50 border-b"><th className="px-3 py-2 text-left text-xs text-gray-500">Description</th><th className="px-3 py-2 text-right text-xs text-gray-500">Qty</th><th className="px-3 py-2 text-right text-xs text-gray-500">Price</th><th className="px-3 py-2 text-right text-xs text-gray-500">Total</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {detail.items.map((item,i)=>(
                          <tr key={i}><td className="px-3 py-2 text-gray-800">{item.desc}</td><td className="px-3 py-2 text-right text-gray-600">{item.qty}</td><td className="px-3 py-2 text-right text-gray-600">₱{(+item.price).toLocaleString()}</td><td className="px-3 py-2 text-right font-semibold text-gray-900">₱{((+item.qty)*(+item.price)).toLocaleString()}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₱{subtotal.toLocaleString()}</span></div>
                  {detail.discount>0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-₱{(+detail.discount).toLocaleString()}</span></div>}
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200"><span>Total</span><span>₱{total.toLocaleString()}</span></div>
                </div>
                <div className="flex gap-2">
                  {detail.status==='accepted' && <button onClick={()=>handleConvert(detail)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2"><ArrowRight size={15}/>Convert to Job Order</button>}
                  {detail.status==='sent' && <button onClick={()=>{handleStatus(detail.id,'accepted');setDetail(null);}} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 rounded-xl transition">Mark Accepted</button>}
                  <button onClick={()=>{setDetail(null);openEdit(detail);}} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 rounded-xl transition">Edit</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-gray-900">{editing?'Edit Quote':'New Quote'}</h2><button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label><input required type="text" value={form.customer} onChange={e=>setForm(p=>({...p,customer:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Phone</label><input type="tel" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Vehicle</label><input type="text" placeholder="2023 Toyota Hilux" value={form.vehicle} onChange={e=>setForm(p=>({...p,vehicle:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Job Type</label><select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className={f}><option value="">Select…</option>{JOB_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Valid Until</label><input type="date" value={form.validUntil} onChange={e=>setForm(p=>({...p,validUntil:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Discount (₱)</label><input type="number" min="0" value={form.discount} onChange={e=>setForm(p=>({...p,discount:e.target.value}))} className={f}/></div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2"><label className="text-xs font-medium text-gray-600">Line Items *</label><button type="button" onClick={addLine} className="text-xs text-orange-500 hover:text-orange-700 font-medium flex items-center gap-1"><Plus size={13}/>Add line</button></div>
                  <div className="space-y-2">
                    {form.items.map((l,i)=>(
                      <div key={i} className="flex gap-2 items-center">
                        <input placeholder="Description" value={l.desc} onChange={e=>updateLine(i,'desc',e.target.value)} className={f.replace('w-full', '') + ' flex-1'}/>
                        <input type="number" placeholder="Qty" min="1" value={l.qty} onChange={e=>updateLine(i,'qty',e.target.value)} className={f+' w-16'}/>
                        <input type="number" placeholder="Price ₱" min="0" value={l.price} onChange={e=>updateLine(i,'price',e.target.value)} className={f+' w-24'}/>
                        <button type="button" onClick={()=>removeLine(i)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
                      </div>
                    ))}
                  </div>
                  {form.items.some(i=>i.price) && (()=>{
                    const {subtotal,total} = calcTotal(form.items,form.discount);
                    return <div className="mt-2 bg-orange-50 rounded-lg p-2.5 text-xs flex gap-4"><span className="text-gray-600">Subtotal: <strong>₱{subtotal.toLocaleString()}</strong></span>{+form.discount>0&&<span className="text-emerald-600">Discount: -₱{(+form.discount).toLocaleString()}</span>}<span className="text-orange-700 font-bold">Total: ₱{total.toLocaleString()}</span></div>;
                  })()}
                </div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label><textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className={f+' resize-none'}/></div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">{saving?'Saving…':editing?'Update':'Create Quote'}</button>
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
