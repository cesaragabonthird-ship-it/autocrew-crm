'use client';
import { useState, useEffect } from 'react';
import { invoicesAPI, productsAPI, jobsAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import { PAYMENT_METHODS } from '@/lib/constants';
import { Plus, Search, X, Receipt, Edit2, Trash2, ChevronRight, DollarSign, Copy, AlertCircle, CheckCircle2, Printer, ChevronDown } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const STATUS_META = {
  draft:   { label:'Draft',    cls:'bg-gray-100 text-gray-600'      },
  sent:    { label:'Sent',     cls:'bg-blue-100 text-blue-700'      },
  paid:    { label:'Paid',     cls:'bg-emerald-100 text-emerald-700' },
  partial: { label:'Partial',  cls:'bg-amber-100 text-amber-700'    },
  overdue: { label:'Overdue',  cls:'bg-red-100 text-red-600'        },
  cancelled:{ label:'Cancelled',cls:'bg-slate-100 text-slate-600'   },
};

const SALE_TYPES = {
  job:  { label:'Job Order', cls:'bg-violet-100 text-violet-700' },
  shop: { label:'Shop Sale', cls:'bg-sky-100 text-sky-700' },
};

const MOCK = [
  { id:'i1', invoiceNumber:'INV-0001', jobNumber:'JO-0004', customer:'Ana Garcia',     phone:'09201234570', vehicle:'2020 Mitsubishi Strada', branch:'North', status:'paid',    issueDate:'2024-05-07', dueDate:'2024-05-14', paidDate:'2024-05-09', paymentMethod:'GCash', amountPaid:3800, items:[{desc:'LED H4 Bulb Set',qty:1,price:680},{desc:'Labor',qty:1,price:3120}], discount:0, tax:0, notes:'' },
  { id:'i2', invoiceNumber:'INV-0002', jobNumber:'JO-0001', customer:'Carlos Reyes',   phone:'09171234567', vehicle:'2022 Toyota Hilux',     branch:'Main',  status:'partial', issueDate:'2024-05-08', dueDate:'2024-05-15', paidDate:'',           paymentMethod:'Cash',  amountPaid:6000, items:[{desc:'Pioneer AVH-Z9200BT',qty:1,price:8000},{desc:'Speaker Set',qty:1,price:2500},{desc:'Installation',qty:1,price:2000}], discount:0, tax:0, notes:'50% downpayment received.' },
  { id:'i3', invoiceNumber:'INV-0003', jobNumber:'JO-0002', customer:'Maria Santos',   phone:'09181234568', vehicle:'2021 Honda City',       branch:'Main',  status:'sent',    issueDate:'2024-05-09', dueDate:'2024-05-16', paidDate:'',           paymentMethod:'',      amountPaid:0,    items:[{desc:'Window Tinting Full Car',qty:1,price:1750},{desc:'Tinting Labor',qty:1,price:4750}], discount:0, tax:0, notes:'' },
  { id:'i4', invoiceNumber:'INV-0004', jobNumber:'JO-0005', customer:'Roberto Lim',    phone:'09211234571', vehicle:'2022 Suzuki Jimny',     branch:'Main',  status:'overdue', issueDate:'2024-04-28', dueDate:'2024-05-05', paidDate:'',           paymentMethod:'',      amountPaid:0,    items:[{desc:'Garmin GPS 65s',qty:1,price:8500},{desc:'Hidden Install',qty:1,price:1000}], discount:0, tax:0, notes:'' },
];

const EMPTY = { saleType:'job', customer:'', phone:'', vehicle:'', jobNumber:'', branch:'Main', issueDate:new Date().toISOString().slice(0,10), dueDate:new Date(Date.now()+7*864e5).toISOString().slice(0,10), items:[{productId:'',sku:'',productQuery:'',desc:'',qty:1,price:''}], discount:'0', tax:'0', amountPaid:'0', paymentMethod:'', notes:'' };
const f = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";
const SEARCHABLE_PRODUCT_FIELDS = ['name', 'sku', 'category', 'supplier'];

function safeJson(s, fb) {
  try { return JSON.parse(s); } catch { return fb; }
}

function normalizeInvoice(inv = {}) {
  const saleType = inv.saleType || (String(inv.invoiceNumber || '').startsWith('POS-') ? 'shop' : 'job');
  const items = Array.isArray(inv.items)
    ? inv.items
    : safeJson(inv.itemsJson, []).map(item => ({ ...item, qty: item.qty ?? 1, price: item.price ?? 0 }));
  
  let status = inv.status || 'sent';
  if (status === 'draft') {
    status = 'sent';
  }
  if (status !== 'paid' && status !== 'cancelled') {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (inv.dueDate && inv.dueDate < todayStr) {
      status = 'overdue';
    }
  }

  return {
    ...inv,
    saleType,
    status,
    items: items.map(item => ({
      productId: item.productId || '',
      sku: item.sku || '',
      desc: item.desc || item.name || '',
      qty: item.qty ?? 1,
      price: item.price ?? '',
    })),
  };
}

function calcInvoice(items,discount,tax) {
  const sub  = (items||[]).reduce((s,i)=>s+(+i.qty||0)*(+i.price||0),0);
  const disc = sub - (+discount||0);
  const txAmt= disc * ((+tax||0)/100);
  return { subtotal:sub, afterDiscount:disc, taxAmount:txAmt, total:disc+txAmt };
}

function lineFromProduct(product) {
  return {
    productId: product?.id || '',
    sku: product?.sku || '',
    productQuery: product ? `${product.name}${product.sku ? ` · ${product.sku}` : ''}` : '',
    desc: product?.name || '',
    qty: 1,
    price: product?.sellingPrice ?? '',
  };
}

export default function InvoicesPage() {
  const { profile } = useUser();
  const searchParams = useSearchParams();
  const quickNew = searchParams?.get('new');
  const [invoices, setInvoices]   = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [showCancelled, setShowCancelled] = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [detail, setDetail]       = useState(null);
  const [jobOrders, setJobOrders] = useState([]);
  const [page, setPage]           = useState(1);

  useEffect(() => {
    let alive = true;
    Promise.all([
      invoicesAPI.getAll(profile?.branchName || profile?.branchId).catch(() => MOCK),
      productsAPI.getAll(profile?.branchName || profile?.branchId).catch(() => []),
      jobsAPI.getAll(profile?.branchName || profile?.branchId).catch(() => []),
    ]).then(([invoiceRows, productRows, jobRows]) => {
      if (!alive) return;
      setInvoices(invoiceRows.map(normalizeInvoice));
      setProducts(productRows);
      setJobOrders(jobRows);
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  },[profile?.branchName, profile?.branchId]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search, showCancelled]);

  useEffect(() => {
    if (quickNew === 'shop') {
      openAdd('shop');
    }
  }, [quickNew]);

  const inferSaleType = inv => inv?.saleType || (!inv?.jobNumber && inv?.invoiceNumber?.startsWith('POS-') ? 'shop' : 'job');
  const nextNum = (saleType='job') => {
    const prefix = saleType === 'shop' ? 'POS' : 'INV';
    const count = invoices.filter(inv => inferSaleType(inv) === saleType).length;
    return `${prefix}-${String(count + 1).padStart(4,'0')}`;
  };
  const openAdd  = (saleType = 'job') => {
    setEditing(null);
    setForm({ ...EMPTY, saleType, branch: profile?.branchName || 'Main Branch', ...(saleType === 'shop' ? { jobNumber:'', vehicle:'' } : {}) });
    setShowForm(true);
  };
  const openEdit = i  => {
    setEditing(i);
    setForm({
      ...EMPTY,
      ...i,
      saleType: inferSaleType(i),
      amountPaid:i.amountPaid||0,
      items: (i.items || []).map(item => ({
        productId: item.productId || '',
        sku: item.sku || '',
        productQuery: item.productQuery || item.desc || '',
        desc: item.desc || '',
        qty: item.qty ?? 1,
        price: item.price ?? '',
      })),
    });
    setShowForm(true);
  };

  const productById = id => products.find(p => p.id === id);
  const setLine = (index, patch) => setForm(p => ({ ...p, items: p.items.map((item, i) => i === index ? { ...item, ...patch } : item) }));
  const onProductPick = (index, productId) => {
    const product = productById(productId);
    setLine(index, {
      ...lineFromProduct(product),
    });
  };
  const addLine = () => setForm(p => ({ ...p, items: [...p.items, { productId:'', sku:'', productQuery:'', desc:'', qty:1, price:'' }] }));
  const removeLine = index => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
  const updateLine = (index, key, value) => setLine(index, { [key]: value });

  const buildPayload = currentForm => {
    const saleType = currentForm.saleType || 'job';
    return {
      ...currentForm,
      branchId: profile?.branchId || '',
      saleType,
      jobNumber: saleType === 'shop' ? '' : currentForm.jobNumber,
      vehicle: saleType === 'shop' ? '' : currentForm.vehicle,
      discount: +currentForm.discount || 0,
      tax: +currentForm.tax || 0,
      amountPaid: +currentForm.amountPaid || 0,
      items: currentForm.items.map(item => ({
        productId: item.productId || '',
        sku: item.sku || '',
        desc: item.desc || '',
        qty: +item.qty || 0,
        price: +item.price || 0,
      })),
    };
  };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = buildPayload(form);
      const { total } = calcInvoice(payload.items, payload.discount, payload.tax);
      payload.status = payload.amountPaid >= total ? 'paid' : payload.amountPaid > 0 ? 'partial' : form.status || 'draft';
      const saved = await invoicesAPI.save(editing ? { ...payload, id: editing.id, invoiceNumber: editing.invoiceNumber } : { ...payload, invoiceNumber: nextNum(payload.saleType) });
      setInvoices(is => editing
        ? is.map(i => i.id === editing.id ? normalizeInvoice(saved) : i)
        : [normalizeInvoice(saved), ...is]
      );
      const latestProducts = await productsAPI.getAll(profile?.branchName || profile?.branchId).catch(() => products);
      setProducts(latestProducts);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (invoice) => {
    const { total } = calcInvoice(invoice.items, invoice.discount, invoice.tax);
    const saved = await invoicesAPI.save({
      ...invoice,
      amountPaid: total,
      paymentMethod: invoice.paymentMethod || 'Cash',
      status: 'paid',
    });
    setInvoices(is => is.map(i => i.id === invoice.id ? normalizeInvoice(saved) : i));
  };

  const cancelInvoice = async (invoice) => {
    const saleType = inferSaleType(invoice);
    const msg = saleType === 'shop'
      ? `Cancel ${invoice.invoiceNumber}? This will restore stock.`
      : `Cancel ${invoice.invoiceNumber}?`;
    if (!confirm(msg)) return;
    const saved = await invoicesAPI.cancel({
      id: invoice.id,
      branchId: profile?.branchId || '',
    });
    setInvoices(is => is.map(i => i.id === invoice.id ? normalizeInvoice(saved) : i));
    const latestProducts = await productsAPI.getAll(profile?.branchName || profile?.branchId).catch(() => products);
    setProducts(latestProducts);
    if (detail?.id === invoice.id) setDetail(null);
  };

  const handleDuplicate = async inv => {
    const saleType = inferSaleType(inv);
    const { id, _id, _creationTime, ...rest } = inv;
    const saved = await invoicesAPI.save({
      ...rest,
      invoiceNumber: nextNum(saleType),
      saleType,
      status: 'draft',
      issueDate: new Date().toISOString().slice(0,10),
      paidDate: '',
      amountPaid: 0,
      paymentMethod: '',
    });
    setInvoices(is => [normalizeInvoice(saved), ...is]);
  };

  const filtered = invoices.filter(inv=>{
    const ms = statusFilter==='all'||inv.status===statusFilter;
    const mc = showCancelled || inv.status !== 'cancelled' || statusFilter === 'cancelled';
    const mq = !search||[inv.invoiceNumber,inv.customer,inv.jobNumber].some(s=>s?.toLowerCase().includes(search.toLowerCase()));
    return ms&&mc&&mq;
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

  const totalRevenue = invoices.filter(i=>i.status==='paid').reduce((s,i)=>{ const {total}=calcInvoice(i.items,i.discount,i.tax); return s+total; },0);
  const totalPending = invoices.filter(i=>['sent','partial'].includes(i.status)).reduce((s,i)=>{ const {total}=calcInvoice(i.items,i.discount,i.tax); return s+total-(i.amountPaid||0); },0);
  const totalOverdue = invoices.filter(i=>i.status==='overdue').reduce((s,i)=>{ const {total}=calcInvoice(i.items,i.discount,i.tax); return s+total; },0);

  return (
    <div className="p-4 md:p-8">
      {/* Header (Non-sticky) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4 mt-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 mt-1 text-sm">{invoices.length} invoices</p>
        </div>
        <button onClick={() => openAdd('job')} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
          <Plus size={17}/> New Invoice
        </button>
      </div>

      {/* Summary Row (Non-sticky) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { l: 'Revenue Collected', v: `₱${totalRevenue.toLocaleString()}` },
          { l: 'Awaiting Payment', v: `₱${totalPending.toLocaleString()}` },
          { l: 'Overdue', v: `₱${totalOverdue.toLocaleString()}` }
        ].map(c => (
          <div key={c.l} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
            <p className="text-[10px] sm:text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">{c.l}</p>
            <p className="text-xl sm:text-3xl font-bold text-gray-900 leading-none">{c.v}</p>
          </div>
        ))}
      </div>

      {/* Sticky Filters & Search Container */}
      <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 -mx-4 md:-mx-8 px-4 md:px-8 pt-2 pb-4 border-b border-gray-200/60 mb-6">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          {/* Mobile Filter Row */}
          <div className="flex gap-2 w-full sm:hidden">
            <div className="bg-gray-100 p-1 rounded-xl flex flex-1">
              {[{k:'all',l:'All'},{k:'paid',l:'Paid'},{k:'partial',l:'Partial'}].map(ft=>(
                <button
                  key={ft.k}
                  onClick={()=>{ setStatus(ft.k); setPage(1); }}
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
                value={['all','paid','partial'].includes(statusFilter) ? 'all' : statusFilter}
                onChange={e=>{ setStatus(e.target.value); setPage(1); }}
                className="appearance-none bg-white border border-gray-300 rounded-xl pl-3.5 pr-8 py-2 text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer h-full"
              >
                <option value="all">More</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-500">
                <ChevronDown size={14} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCancelled(v => !v)}
              className={`px-3 py-2 border rounded-xl text-xs font-semibold transition ${showCancelled ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-gray-300 text-gray-700 hover:border-slate-300'}`}
            >
              {showCancelled ? 'Hide' : 'Show Cancel'}
            </button>
          </div>

          {/* Desktop Filter Row */}
          <div className="hidden sm:flex gap-1.5 flex-wrap">
            {['all',...Object.keys(STATUS_META)].map(s=>(
              <button key={s} onClick={()=>{ setStatus(s); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter===s?'bg-orange-500 text-white':'bg-white border border-gray-300 text-gray-600 hover:border-orange-300'}`}>
                {s==='all'?'All':STATUS_META[s]?.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCancelled(v => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${showCancelled ? 'bg-slate-700 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-slate-300'}`}
            >
              {showCancelled ? 'Hide Cancelled' : 'Show Cancelled'}
            </button>
          </div>

          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-3 sm:top-2.5 text-gray-400"/>
            <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }} placeholder="Search invoice, customer, job ref…" className="w-full pl-9 pr-8 py-2 sm:py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"/>
            {search && <button onClick={()=>{ setSearch(''); setPage(1); }} className="absolute right-3 top-3 sm:top-2.5 text-gray-400"><X size={14}/></button>}
          </div>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full"/></div> : (
        <div>
          <div className="space-y-3">
            {filtered.length===0 ? (
              <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                <Receipt size={40} className="mx-auto text-gray-300 mb-3"/>
                <p className="text-gray-500 text-sm">No invoices found</p>
              </div>
            ) : paginated.map(inv=>{
              const saleType = inferSaleType(inv);
              const {total} = calcInvoice(inv.items,inv.discount,inv.tax);
              const balance = total - (inv.amountPaid||0);
              const sm = STATUS_META[inv.status]||STATUS_META.draft;
              return (
                <div key={inv.id || inv._id} className={`bg-white rounded-xl border p-4 sm:p-5 hover:shadow-sm transition flex flex-col gap-3 cursor-pointer ${inv.status==='cancelled' ? 'border-slate-200 opacity-70' : inv.status==='overdue'?'border-red-200':'border-gray-200'}`} onClick={()=>setDetail(inv)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-gray-400">{inv.invoiceNumber}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg ${SALE_TYPES[saleType]?.cls || SALE_TYPES.job.cls}`}>{SALE_TYPES[saleType]?.label || 'Job Order'}</span>
                        {inv.jobNumber && <span className="text-xs font-mono text-gray-400">→ {inv.jobNumber}</span>}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{inv.customer}</h3>
                    </div>
                    
                    <div className="text-right flex-shrink-0 flex flex-col items-end">
                      <span className="font-bold text-gray-900 text-sm sm:text-base">₱{total.toLocaleString()}</span>
                      {balance>0 && balance<total && <span className="text-[10px] text-amber-600 font-medium mt-0.5">Bal: ₱{balance.toLocaleString()}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-xs text-gray-500 border-t border-gray-100/60 pt-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span>Vehicle: {inv.vehicle || '—'}</span>
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-lg ${sm.cls}`}>{sm.label}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap text-gray-400">
                      <span>Issued: {inv.issueDate}</span>
                      <span className={inv.status==='overdue'?'text-red-500 font-medium':''}>Due: {inv.dueDate}</span>
                    </div>
                    {inv.paidDate && (
                      <div className="text-emerald-600 font-medium">Paid: {inv.paidDate} ({inv.paymentMethod})</div>
                    )}
                  </div>

                  {/* Items preview & actions */}
                  <div className="flex items-center justify-between gap-2 border-t border-gray-100/60 pt-2.5 mt-0.5">
                    <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                      {inv.items.slice(0, 2).map((item, i) => (
                        <span key={i} className="text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-lg truncate max-w-[120px]">
                          {item.desc} ×{item.qty}
                        </span>
                      ))}
                      {inv.items.length > 2 && <span className="text-[11px] text-gray-400 flex-shrink-0">+{inv.items.length - 2} more</span>}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0" onClick={e=>e.stopPropagation()}>
                      {inv.status!=='paid' && inv.status!=='cancelled' && (
                        <button onClick={()=>markPaid(inv)} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition shadow-sm">
                          <DollarSign size={12}/> <span>Mark Paid</span>
                        </button>
                      )}
                      {inv.status !== 'cancelled' && (
                        <button onClick={()=>cancelInvoice(inv)} className="p-1.5 hover:bg-rose-50 rounded-md text-gray-400 hover:text-rose-600 transition"><Trash2 size={13}/></button>
                      )}
                      <button onClick={()=>openEdit(inv)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition"><Edit2 size={13}/></button>
                      <button onClick={()=>setDetail(inv)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition"><ChevronRight size={15}/></button>
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
      {detail && (()=>{
        const {subtotal,afterDiscount,taxAmount,total} = calcInvoice(detail.items,detail.discount,detail.tax);
        const balance = total - (detail.amountPaid||0);
        const sm = STATUS_META[detail.status]||STATUS_META.draft;
        const saleType = inferSaleType(detail);
        return (
          <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={()=>setDetail(null)}>
            <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div><p className="font-bold text-gray-900">{detail.customer}</p><p className="text-xs font-mono text-gray-400">{detail.invoiceNumber}</p></div>
              <div className="flex items-center gap-2"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SALE_TYPES[saleType]?.cls || SALE_TYPES.job.cls}`}>{SALE_TYPES[saleType]?.label || 'Job Order'}</span><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span><button onClick={()=>setDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  {[{l:'Sale Type',v:SALE_TYPES[saleType]?.label||'Job Order'},{l:'Vehicle',v:detail.vehicle||'—'},{l:'Branch',v:detail.branch},{l:'Issue Date',v:detail.issueDate},{l:'Due Date',v:detail.dueDate},{l:'Job Ref',v:detail.jobNumber||'—'},{l:'Payment',v:detail.paymentMethod||'—'}].map(i=>(
                    <div key={i.l} className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-0.5">{i.l}</p><p className="font-semibold text-gray-900 text-sm">{i.v}</p></div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Items</p>
                  <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm min-w-[320px]">
                      <thead><tr className="bg-gray-50 border-b"><th className="px-3 py-2 text-left text-xs text-gray-500">Description</th><th className="px-3 py-2 text-right text-xs text-gray-500">Qty</th><th className="px-3 py-2 text-right text-xs text-gray-500">Price</th><th className="px-3 py-2 text-right text-xs text-gray-500">Amount</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {detail.items.map((item,i)=>(
                          <tr key={i}><td className="px-3 py-2 text-gray-800">{item.desc}</td><td className="px-3 py-2 text-right text-gray-600">{item.qty}</td><td className="px-3 py-2 text-right text-gray-600">₱{(+item.price).toLocaleString()}</td><td className="px-3 py-2 text-right font-semibold">₱{((+item.qty)*(+item.price)).toLocaleString()}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₱{subtotal.toLocaleString()}</span></div>
                  {detail.discount>0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-₱{(+detail.discount).toLocaleString()}</span></div>}
                  {detail.tax>0 && <div className="flex justify-between text-gray-600"><span>Tax ({detail.tax}%)</span><span>₱{taxAmount.toFixed(0)}</span></div>}
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200"><span>Total</span><span>₱{total.toLocaleString()}</span></div>
                  {(detail.amountPaid||0)>0 && <><div className="flex justify-between text-emerald-600"><span>Amount Paid</span><span>-₱{(detail.amountPaid||0).toLocaleString()}</span></div><div className="flex justify-between font-bold text-red-600"><span>Balance Due</span><span>₱{balance.toLocaleString()}</span></div></>}
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  {detail.status!=='paid' && detail.status!=='cancelled' && <button onClick={async()=>{await markPaid(detail);setDetail(null);}} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2"><DollarSign size={15}/>Mark as Paid</button>}
                  {detail.status!=='cancelled' && <button onClick={async()=>{await cancelInvoice(detail);}} className="flex-1 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium py-2.5 rounded-xl transition">Cancel Sale</button>}
                  <button onClick={async()=>{await handleDuplicate(detail);setDetail(null);}} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 rounded-xl transition">Duplicate</button>
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
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-gray-900">{editing?'Edit Invoice':'New Invoice'}</h2><button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Sale Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(SALE_TYPES).map(([value, meta]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm({
                        ...EMPTY,
                        saleType: value,
                        branch: profile?.branchName || 'Main Branch',
                        issueDate: new Date().toISOString().slice(0, 10),
                        dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
                      })}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${form.saleType === value ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-300 text-gray-600 hover:border-orange-300'}`}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Shop Sale is for walk-in purchases without an installation job.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label><input required readOnly={form.saleType === 'job'} type="text" value={form.customer} onChange={e=>setForm(p=>({...p,customer:e.target.value}))} className={f + (form.saleType === 'job' ? " bg-gray-50 cursor-not-allowed text-gray-500" : "")}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Phone</label><input readOnly={form.saleType === 'job'} type="tel" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} className={f + (form.saleType === 'job' ? " bg-gray-50 cursor-not-allowed text-gray-500" : "")}/></div>
                {form.saleType !== 'shop' ? (
                  <>
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Vehicle</label><input readOnly={form.saleType === 'job'} type="text" value={form.vehicle} onChange={e=>setForm(p=>({...p,vehicle:e.target.value}))} className={f + (form.saleType === 'job' ? " bg-gray-50 cursor-not-allowed text-gray-500" : "")}/></div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Job Order Ref *</label>
                      <select
                        required
                        value={form.jobNumber || ''}
                        onChange={e => {
                          const selectedJO = e.target.value;
                          const matched = jobOrders.find(j => j.jobNumber === selectedJO);
                          if (matched) {
                            const partsItems = (matched.parts || []).map(p => {
                              const prod = products.find(prd => prd.sku === p.sku || prd.name === p.name);
                              return {
                                productId: prod?.id || prod?._id || '',
                                sku: p.sku || '',
                                desc: p.name,
                                productQuery: p.name,
                                qty: p.qty,
                                price: p.price,
                              };
                            });
                            if (matched.labor > 0) {
                              partsItems.push({
                                productId: '',
                                sku: 'LABOR',
                                desc: 'Labor Fee',
                                productQuery: 'Labor Fee',
                                qty: 1,
                                price: matched.labor,
                              });
                            }
                            setForm(p => ({
                              ...p,
                              saleType: 'job',
                              jobNumber: selectedJO,
                              jobId: matched.id || String(matched._id),
                              customer: matched.customer,
                              phone: matched.phone || '',
                              vehicle: matched.vehicle || '',
                              branch: matched.branch,
                              items: partsItems,
                            }));
                          } else {
                            setForm(p => ({ ...p, jobNumber: selectedJO }));
                          }
                        }}
                        className={f}
                      >
                        <option value="">Select Job Order…</option>
                        {jobOrders
                          .filter(j => {
                            if (form.jobNumber && j.jobNumber === form.jobNumber) return true;
                            const isAlreadyInvoiced = invoices.some(inv => 
                              inv.jobNumber === j.jobNumber && inv.status !== 'cancelled'
                            );
                            return !isAlreadyInvoiced;
                          })
                          .map(j => (
                            <option key={j.id || j._id} value={j.jobNumber}>
                              {j.jobNumber} ({j.customer} — {j.vehicle})
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="col-span-1 sm:col-span-2 bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs text-sky-700">
                    Shop Sale mode skips the job order fields. You can sell items from the shop without creating an installation ticket.
                  </div>
                )}
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Issue Date</label><input type="date" value={form.issueDate} onChange={e=>setForm(p=>({...p,issueDate:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label><input type="date" value={form.dueDate} onChange={e=>setForm(p=>({...p,dueDate:e.target.value}))} className={f}/></div>
                <div className="col-span-1 sm:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">Line Items *</label>
                    {form.saleType !== 'job' && (
                      <button type="button" onClick={addLine} className="text-xs text-orange-500 hover:text-orange-700 font-medium flex items-center gap-1">
                        <Plus size={13}/>Add line
                      </button>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {form.items.map((l,i)=>(
                      form.saleType === 'job' ? (
                        <div key={i} className="grid grid-cols-12 gap-2 items-start bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/50 md:bg-transparent md:p-0 md:border-0">
                          <div className="col-span-12 md:col-span-8 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 font-medium">
                            {l.desc} {l.sku ? `(SKU: ${l.sku})` : ''}
                          </div>
                          <div className="col-span-6 md:col-span-2 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 text-center font-medium">
                            Qty: {l.qty}
                          </div>
                          <div className="col-span-6 md:col-span-2 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 text-right font-medium">
                            ₱{(+l.price || 0).toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <div key={i} className="flex flex-col sm:flex-row gap-2 border border-gray-100 bg-gray-50/50 p-2.5 rounded-lg sm:border-0 sm:bg-transparent sm:p-0">
                          <div className="flex-1 min-w-0 relative">
                            {l.sku === 'LABOR' ? (
                              <div className="bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 font-medium h-[38px] flex items-center">
                                {l.desc || 'Labor Fee'}
                              </div>
                            ) : (
                              <select
                                required
                                value={l.productId || ''}
                                onChange={e => {
                                  const prodId = e.target.value;
                                  const match = products.find(p => p.id === prodId || p._id === prodId);
                                  if (match) {
                                    setLine(i, {
                                      productId: match.id || String(match._id),
                                      sku: match.sku,
                                      desc: match.name,
                                      productQuery: match.name,
                                      price: match.sellingPrice,
                                    });
                                  } else {
                                    setLine(i, { productId: '', sku: '', desc: '', productQuery: '', price: '' });
                                  }
                                }}
                                className={f}
                              >
                                <option value="">Select product…</option>
                                {uniqueProducts.map(p => (
                                  <option key={p.id || p._id} value={p.id || String(p._id)}>
                                    {p.name} (SKU: {p.sku || 'N/A'})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="flex gap-2 items-center w-full sm:w-auto">
                            <input
                              type="number"
                              placeholder="Qty"
                              min="1"
                              value={l.qty}
                              onChange={e=>updateLine(i,'qty',e.target.value)}
                              className={f + " w-20 flex-1 sm:flex-initial sm:w-16 text-right"}
                            />
                            <div className="flex-1 bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 text-right h-[38px] flex items-center justify-end sm:flex-initial sm:w-24">
                              ₱{l.price ? (+l.price).toLocaleString() : '0'}
                            </div>
                            <button
                              type="button"
                              onClick={()=>removeLine(i)}
                              className="text-gray-400 hover:text-red-500 flex-shrink-0 p-1 animate-fadeIn"
                            >
                              <X size={18}/>
                            </button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Discount (₱)</label><input type="number" min="0" value={form.discount} onChange={e=>setForm(p=>({...p,discount:e.target.value}))} className={f}/></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Tax (%)</label><input type="number" min="0" max="30" step="0.1" value={form.tax} onChange={e=>setForm(p=>({...p,tax:e.target.value}))} className={f}/></div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount Paid (₱)</label>
                  <input
                    type="number"
                    min="0"
                    disabled={!form.paymentMethod}
                    value={!form.paymentMethod ? "0" : form.amountPaid}
                    onChange={e=>setForm(p=>({...p,amountPaid:e.target.value}))}
                    className={f + (!form.paymentMethod ? " bg-gray-50 cursor-not-allowed text-gray-400" : "")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={e=>{
                      const method = e.target.value;
                      setForm(p => {
                        const {total} = calcInvoice(p.items, p.discount, p.tax);
                        return {
                          ...p,
                          paymentMethod: method,
                          amountPaid: !method ? "0" : String(total),
                        };
                      });
                    }}
                    className={f}
                  >
                    <option value="">Not paid yet</option>
                    {PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                {form.items.some(i=>i.price) && (()=>{
                  const {total}=calcInvoice(form.items,form.discount,form.tax);
                  const bal = total-(+form.amountPaid||0);
                  return <div className="col-span-1 sm:col-span-2 bg-orange-50 rounded-lg p-3 text-xs flex gap-4"><span className="text-orange-700 font-bold text-base">Total: ₱{total.toLocaleString()}</span>{bal>0&&bal<total&&<span className="text-amber-600">Balance: ₱{bal.toLocaleString()}</span>}{bal<=0&&<span className="text-emerald-600 font-semibold">✓ Fully Paid</span>}</div>;
                })()}
                <div className="col-span-1 sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label><textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className={f+' resize-none'}/></div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">{saving?'Saving…':editing?'Update':'Create Invoice'}</button>
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
