'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@/lib/UserContext';
import { paymentsAPI, tenantAPI } from '@/lib/convex-api';
import {
  CreditCard, TrendingUp, DollarSign, Calendar, Search, Filter,
  FileText, Loader2, ArrowUpRight
} from 'lucide-react';

const PLAN_PRICES = { starter: 0, growth: 2499, pro: 4999 };

export default function PaymentsPage() {
  const { clerkId } = useUser();
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  const fetchData = async () => {
    if (!clerkId) return;
    try {
      setLoading(true);
      const [pays, tnts] = await Promise.all([
        paymentsAPI.getSubscriptionPayments(clerkId),
        tenantAPI.getAll(clerkId)
      ]);
      setPayments(pays || []);
      setTenants(tnts || []);
    } catch (err) {
      console.error('Failed to load payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clerkId]);

  // Calculations
  const totalRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  
  // Calculate MRR based on active plans
  const estimatedMRR = tenants
    .filter(t => t.status === 'active')
    .reduce((acc, t) => {
      const planPrice = PLAN_PRICES[t.plan?.toLowerCase()] || 2499;
      return acc + planPrice;
    }, 0);

  const activeSubscribersCount = tenants.filter(t => t.status === 'active').length;
  const averagePayment = payments.length > 0 ? (totalRevenue / payments.length) : 0;

  // Search/Filter
  const filteredPayments = payments.filter(p => {
    const termMatch = 
      p.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.receiptNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reference?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (methodFilter === 'all') return termMatch;
    return termMatch && p.method === methodFilter;
  });

  // Sort payments by date descending, then creation time descending
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    const dateComp = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateComp !== 0) return dateComp;
    return (b._creationTime || 0) - (a._creationTime || 0);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Billing & Payments</h1>
        <p className="text-sm text-gray-500">Track AutoCrew platform subscription revenue, manage billing history, and monitor monthly recurring revenue (MRR).</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-orange-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Revenue</span>
            <div className="bg-orange-50 p-2 rounded-xl">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-950">₱{totalRevenue.toLocaleString()}</div>
          <p className="text-[10px] text-gray-400 mt-1">All subscription fees logged to date</p>
        </div>

        {/* Estimated MRR */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Estimated MRR</span>
            <div className="bg-emerald-50 p-2 rounded-xl">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-950">₱{estimatedMRR.toLocaleString()}</div>
          <p className="text-[10px] text-gray-400 mt-1">Based on active subscription rates</p>
        </div>

        {/* Active Subscribers */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-blue-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active Tenants</span>
            <div className="bg-blue-50 p-2 rounded-xl">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-950">{activeSubscribersCount}</div>
          <p className="text-[10px] text-gray-400 mt-1">Paying customers currently active</p>
        </div>

        {/* Average Transaction */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Avg. Payment</span>
            <div className="bg-amber-50 p-2 rounded-xl">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-950">₱{averagePayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <p className="text-[10px] text-gray-400 mt-1">Average invoice transaction size</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by receipt number, shop name, reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="pl-8 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white appearance-none cursor-pointer focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Payment Methods</option>
              <option value="GCash">GCash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Check">Check</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Receipts History */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
          <Loader2 className="animate-spin text-orange-500 mb-3" size={28} />
          <p className="text-sm font-semibold text-gray-500">Loading payment records...</p>
        </div>
      ) : sortedPayments.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
          <FileText size={40} className="text-gray-300 mx-auto mb-4" />
          <p className="font-semibold text-gray-700">No payment receipts logged</p>
          <p className="text-xs text-gray-400 mt-1">Try updating your filters or check back later.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Receipt Info</th>
                  <th className="px-6 py-4">Shop Client</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Transaction Date</th>
                  <th className="px-6 py-4">Method & Reference</th>
                  <th className="px-6 py-4">Internal Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedPayments.map((p) => (
                  <tr key={p._id || p.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-gray-950">
                      {p.receiptNumber}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-bold">{p.customer}</td>
                    <td className="px-6 py-4 text-gray-900 font-bold">
                      ₱{p.amount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">
                      {new Date(p.date).toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-700 font-semibold">{p.method}</div>
                      {p.reference && (
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">Ref: {p.reference}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 font-medium max-w-xs truncate" title={p.notes}>
                      {p.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
