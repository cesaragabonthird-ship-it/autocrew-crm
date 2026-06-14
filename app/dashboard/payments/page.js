'use client';
import { useState, useEffect } from 'react';
import { paymentsAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import { PAYMENT_METHODS } from '@/lib/constants';
import { Plus, Search, X, DollarSign, TrendingUp, CheckCircle2, Clock, ChevronDown } from 'lucide-react';

const MOCK = [
  { id:'pay1', receiptNumber:'REC-0001', invoiceNumber:'INV-0001', jobNumber:'JO-0004', customer:'Ana Garcia',   branch:'North', amount:3800,  method:'GCash',        reference:'9876543210', date:'2024-05-09', notes:'' },
  { id:'pay2', receiptNumber:'REC-0002', invoiceNumber:'INV-0002', jobNumber:'JO-0001', customer:'Carlos Reyes', branch:'Main',  amount:6000,  method:'Cash',         reference:'',           date:'2024-05-08', notes:'50% downpayment' },
  { id:'pay3', receiptNumber:'REC-0003', invoiceNumber:'INV-0004', jobNumber:'JO-0005', customer:'Roberto Lim',  branch:'Main',  amount:5000,  method:'Bank Transfer', reference:'TXN20240502',date:'2024-05-02', notes:'Partial payment' },
  { id:'pay4', receiptNumber:'REC-0004', invoiceNumber:'INV-0003', jobNumber:'JO-0002', customer:'Maria Santos', branch:'Main',  amount:6500,  method:'Maya',         reference:'MAYA123456', date:'2024-05-10', notes:'' },
];

const EMPTY = { customer:'', invoiceNumber:'', jobNumber:'', branch:'', amount:'', method:'Cash', reference:'', date:new Date().toISOString().slice(0,10), notes:'' };
const f = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

const METHOD_CLS = { Cash:'bg-emerald-100 text-emerald-700', GCash:'bg-blue-100 text-blue-700', Maya:'bg-purple-100 text-purple-700', 'Bank Transfer':'bg-amber-100 text-amber-700', 'Credit Card':'bg-red-100 text-red-600', Installment:'bg-gray-100 text-gray-600' };

export default function PaymentsPage() {
  const { profile } = useUser();
  const [payments, setPayments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [methodFilter, setMethod] = useState('all');
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [page, setPage]           = useState(1);

  useEffect(() => {
    setPage(1);
  }, [methodFilter, search]);

  useEffect(() => {
    paymentsAPI.getAll(profile?.branchName || profile?.branchId).then(setPayments).catch(()=>setPayments(MOCK)).finally(()=>setLoading(false));
  }, [profile?.branchName, profile?.branchId]);

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      let receiptNumber = '';
      if (form.invoiceNumber) {
        const seq = payments.filter(p => p.invoiceNumber === form.invoiceNumber).length + 1;
        receiptNumber = `REC-${form.invoiceNumber}${seq > 1 ? `-${seq}` : ''}`;
      } else if (form.jobNumber) {
        const seq = payments.filter(p => p.jobNumber === form.jobNumber).length + 1;
        receiptNumber = `REC-${form.jobNumber}${seq > 1 ? `-${seq}` : ''}`;
      } else {
        receiptNumber = `REC-${String(payments.length+1).padStart(4,'0')}`;
      }

      const payload = {
        receiptNumber,
        customer: form.customer,
        invoiceNumber: form.invoiceNumber || undefined,
        jobNumber: form.jobNumber || undefined,
        branch: form.branch || profile?.branchName || 'Main Branch',
        amount: Number(form.amount) || 0,
        method: form.method,
        reference: form.reference || undefined,
        date: form.date,
        notes: form.notes || undefined,
      };
      await paymentsAPI.add(payload);
      const list = await paymentsAPI.getAll(profile?.branchName || profile?.branchId);
      setPayments(list);
      setShowForm(false);
      setForm(EMPTY);
    } catch (err) {
      console.error(err);
      alert("Failed to save payment to database.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = payments.filter(p => {
    const mm = methodFilter==='all'||p.method===methodFilter;
    const mq = !search||[p.customer,p.receiptNumber,p.invoiceNumber,p.reference].some(s=>s?.toLowerCase().includes(search.toLowerCase()));
    return mm&&mq;
  });

  const activePayments = payments.filter(p => !p.invoiceCancelled);
  const totalCollected = activePayments.reduce((s,p)=>s+(+p.amount||0),0);
  const todayCollected = activePayments.filter(p=>p.date===new Date().toISOString().slice(0,10)).reduce((s,p)=>s+(+p.amount||0),0);
  const byMethod = PAYMENT_METHODS.reduce((acc,m)=>{
    const total = activePayments.filter(p=>p.method===m).reduce((s,p)=>s+(+p.amount||0),0);
    if (total>0) acc.push({ method:m, total, count:activePayments.filter(p=>p.method===m).length });
    return acc;
  },[]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filtered.length, totalPages, page]);

  return (
    <div className="p-4 md:p-8">
      {/* Header (Non-sticky) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4 mt-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-1 text-sm">{payments.length} transactions · ₱{totalCollected.toLocaleString()} total collected</p>
        </div>
        <button onClick={()=>setShowForm(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
          <Plus size={17}/> Log Payment
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Total Collected</p>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 leading-none">₱{totalCollected.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Today</p>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 leading-none">₱{todayCollected.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Transactions</p>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 leading-none">{payments.length}</p>
        </div>
      </div>

      {/* Sticky Filters & Search Container */}
      <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 -mx-4 md:-mx-8 px-4 md:px-8 pt-2 pb-4 border-b border-gray-200/60 mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          {/* Mobile Filter Row */}
          <div className="flex gap-2 w-full sm:hidden">
            <div className="bg-gray-100 p-1 rounded-xl flex flex-1">
              {[{k:'all',l:'All'},{k:'Cash',l:'Cash'},{k:'GCash',l:'GCash'}].map(ft=>(
                <button
                  key={ft.k}
                  onClick={()=>{ setMethod(ft.k); setPage(1); }}
                  className={`flex-1 py-1.5 text-center rounded-lg text-xs font-semibold transition-all duration-200 ${
                    methodFilter===ft.k
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
                value={['all','Cash','GCash'].includes(methodFilter) ? 'all' : methodFilter}
                onChange={e=>{ setMethod(e.target.value); setPage(1); }}
                className="appearance-none bg-white border border-gray-300 rounded-xl pl-3.5 pr-8 py-2 text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer h-full"
              >
                <option value="all">More</option>
                {PAYMENT_METHODS.filter(m => !['Cash', 'GCash'].includes(m)).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-500">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {/* Desktop Filter Row */}
          <div className="hidden sm:flex gap-1.5 flex-wrap">
            {['all',...PAYMENT_METHODS].map(m=>(
              <button key={m} onClick={()=>{ setMethod(m); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${methodFilter===m?'bg-orange-500 text-white':'bg-white border border-gray-300 text-gray-600 hover:border-orange-300'}`}>
                {m==='all'?'All':m}
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-3 sm:top-2.5 text-gray-400"/>
            <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }} placeholder="Search customer, receipt, reference…" className="w-full pl-9 pr-8 py-2 sm:py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"/>
            {search && <button onClick={()=>{ setSearch(''); setPage(1); }} className="absolute right-3 top-3 sm:top-2.5 text-gray-400"><X size={14}/></button>}
          </div>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/></div> : (
        <div>
          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {filtered.length===0 ? (
              <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                <DollarSign size={40} className="mx-auto text-gray-300 mb-3"/>
                <p className="text-gray-500 text-sm">No payments found</p>
              </div>
            ) : paginated.map(p=>(
              <div key={p.id || p._id} className={`bg-white rounded-xl border p-4 hover:shadow-sm transition flex flex-col gap-2.5 ${p.invoiceCancelled ? 'border-slate-200 opacity-60 bg-gray-50/50' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="text-[10px] font-mono text-gray-400">{p.receiptNumber}</span>
                      <span className="text-gray-300 text-[10px]">•</span>
                      <span className="text-xs text-gray-500">{p.date}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{p.customer}</h3>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`font-bold text-sm ${p.invoiceCancelled ? 'text-gray-400 line-through' : 'text-emerald-700'}`}>₱{(+p.amount).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-[11px] text-gray-500 border-t border-gray-100/60 pt-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {p.invoiceNumber && (
                        <span className="font-mono text-gray-400">Inv: {p.invoiceNumber}</span>
                      )}
                      {p.jobNumber && (
                        <span className="font-mono text-gray-400">Job: {p.jobNumber}</span>
                      )}
                      {p.invoiceCancelled && (
                        <span className="bg-red-50 text-red-700 border border-red-100 text-[9px] font-bold px-1.5 py-0.5 rounded">Void</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg ${METHOD_CLS[p.method] || 'bg-gray-100 text-gray-600'}`}>{p.method}</span>
                  </div>
                  {p.reference && (
                    <div className="text-gray-400 truncate">Ref: {p.reference}</div>
                  )}
                  {p.notes && (
                    <div className="italic text-gray-400 truncate">Note: {p.notes}</div>
                  )}
                  {p.invoiceCancelled && (
                    <div className="text-red-500 font-medium">Invoice Cancelled</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-200">{['Date','Receipt','Customer','Invoice No','Job Order','Notes','Method','Amount'].map(h=><th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase ${h==='Amount'?'text-right':'text-left'}`}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length===0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">No payments found</td></tr>
                : paginated.map(p=>(
                  <tr key={p.id} className={`hover:bg-gray-50 transition ${p.invoiceCancelled ? 'opacity-60 bg-gray-50/50' : ''}`}>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{p.date}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{p.receiptNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.customer}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      <span className="flex items-center gap-1">
                        {p.invoiceNumber||'—'}
                        {p.invoiceCancelled && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">Void / Cancelled</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{p.jobNumber||'—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 italic">
                      {p.invoiceCancelled ? <span className="text-red-500 not-italic font-medium">Invoice Cancelled</span> : p.notes||'—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{p.method}</td>
                    <td className={`px-4 py-3 text-sm font-bold text-right ${p.invoiceCancelled ? 'text-gray-400 line-through' : 'text-emerald-700'}`}>₱{(+p.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

      {/* Log payment modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-gray-900">Log Payment</h2><button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
            <form onSubmit={handleSave}>
              <div className="space-y-4 mb-4">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label><input required type="text" value={form.customer} onChange={e=>setForm(p=>({...p,customer:e.target.value}))} className={f}/></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Invoice #</label><input type="text" placeholder="INV-0001" value={form.invoiceNumber} onChange={e=>setForm(p=>({...p,invoiceNumber:e.target.value}))} className={f}/></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Job Order #</label><input type="text" placeholder="JO-0001" value={form.jobNumber} onChange={e=>setForm(p=>({...p,jobNumber:e.target.value}))} className={f}/></div>
                </div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Amount (₱) *</label><input required type="number" min="0" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} className={f}/></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Method</label><select value={form.method} onChange={e=>setForm(p=>({...p,method:e.target.value}))} className={f}>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</select></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Date</label><input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} className={f}/></div>
                </div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Reference / Transaction ID</label><input type="text" value={form.reference} onChange={e=>setForm(p=>({...p,reference:e.target.value}))} className={f} placeholder="GCash ref, bank TXN…"/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label><textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className={f+' resize-none'}/></div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">{saving?'Saving…':'Log Payment'}</button>
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
