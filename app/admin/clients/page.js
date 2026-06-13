'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@/lib/UserContext';
import { tenantAPI } from '@/lib/convex-api';
import {
  Users, CheckCircle2, AlertCircle, Ban, Search,
  Filter, Wallet, Calendar, Phone, Mail, ToggleLeft, ToggleRight,
  ShieldCheck, X, DollarSign, Loader2
} from 'lucide-react';

export default function ClientsPage() {
  const { clerkId } = useUser();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Payment modal state
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [amount, setAmount] = useState('2499');
  const [method, setMethod] = useState('GCash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchTenants = async () => {
    if (!clerkId) return;
    try {
      setLoading(true);
      const res = await tenantAPI.getAll(clerkId);
      setTenants(res || []);
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [clerkId]);

  const handleToggleStatus = async (tenant) => {
    try {
      if (tenant.status === 'suspended') {
        await tenantAPI.activate(tenant._id || tenant.id);
        setSuccessMsg(`Activated "${tenant.shopName}" successfully.`);
      } else {
        if (!confirm(`Are you sure you want to suspend "${tenant.shopName}"?`)) return;
        await tenantAPI.suspend(tenant._id || tenant.id);
        setSuccessMsg(`Suspended "${tenant.shopName}" successfully.`);
      }
      fetchTenants();
    } catch (err) {
      setErrorMsg(`Failed to toggle status: ${err.message}`);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedTenant) return;
    try {
      setSavingPayment(true);
      setErrorMsg('');
      const amtNum = parseFloat(amount);
      if (isNaN(amtNum) || amtNum <= 0) {
        throw new Error('Please enter a valid payment amount.');
      }
      await tenantAPI.markPaid(selectedTenant._id || selectedTenant.id, {
        amount: amtNum,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      
      setSuccessMsg(`Successfully logged ₱${amtNum.toLocaleString()} payment and renewed "${selectedTenant.shopName}".`);
      setSelectedTenant(null);
      setAmount('2499');
      setReference('');
      setNotes('');
      fetchTenants();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingPayment(false);
    }
  };

  // Clear messages after 4 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Filters & Search
  const filteredTenants = tenants.filter(t => {
    const nameMatch =
      t.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return nameMatch;
    return nameMatch && t.status === statusFilter;
  });

  // Calculate metrics
  const totalClients = tenants.length;
  const activeCount = tenants.filter(t => t.status === 'active').length;
  const trialCount = tenants.filter(t => t.status === 'trial').length;
  const suspendedCount = tenants.filter(t => t.status === 'suspended').length;
  const graceCount = tenants.filter(t => t.status === 'grace').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">Active</span>;
      case 'trial':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700">Trial</span>;
      case 'grace':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700">Overdue (Grace)</span>;
      case 'suspended':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">Suspended</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-600 capitalize">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Clients Directory</h1>
          <p className="text-sm text-gray-500">View and manage AutoCrew subscribers, handle plan upgrades, and record payments.</p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
          <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={18} />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
          <AlertCircle className="text-rose-500 flex-shrink-0" size={18} />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Clients</span>
            <Users size={18} className="text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-950">{totalClients}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-emerald-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active</span>
            <CheckCircle2 size={18} />
          </div>
          <div className="text-2xl font-bold text-gray-950">{activeCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-blue-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Free Trial</span>
            <Calendar size={18} />
          </div>
          <div className="text-2xl font-bold text-gray-950">{trialCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Overdue</span>
            <AlertCircle size={18} />
          </div>
          <div className="text-2xl font-bold text-gray-950">{graceCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-rose-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Suspended</span>
            <Ban size={18} />
          </div>
          <div className="text-2xl font-bold text-gray-950">{suspendedCount}</div>
        </div>
      </div>

      {/* Controls: Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by shop name, owner name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-8 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white appearance-none cursor-pointer focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="grace">Grace Period</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
          <Loader2 className="animate-spin text-orange-500 mb-3" size={28} />
          <p className="text-sm font-semibold text-gray-500">Loading clients list...</p>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
          <Users size={40} className="text-gray-300 mx-auto mb-4" />
          <p className="font-semibold text-gray-700">No tenants found</p>
          <p className="text-xs text-gray-400 mt-1">Try updating your search query or filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Shop Details</th>
                  <th className="px-6 py-4">Owner Name</th>
                  <th className="px-6 py-4">Subscription Plan</th>
                  <th className="px-6 py-4">Billing Deadlines</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTenants.map((t) => {
                  const daysLeft = t.nextBillingDate
                    ? Math.ceil((new Date(t.nextBillingDate).getTime() - Date.now()) / 864e5)
                    : null;
                  const isTrial = t.status === 'trial';
                  
                  return (
                    <tr key={t._id || t.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{t.shopName}</div>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Mail size={12} />
                            <span>{t.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Phone size={12} />
                            <span>{t.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{t.ownerName}</td>
                      <td className="px-6 py-4">
                        <select
                          value={t.plan}
                          onChange={async (e) => {
                            const newPlan = e.target.value;
                            try {
                              await tenantAPI.update(t._id || t.id, { plan: newPlan });
                              setSuccessMsg(`Updated subscription plan for "${t.shopName}" to ${newPlan.toUpperCase()} successfully.`);
                              fetchTenants();
                            } catch (err) {
                              setErrorMsg(`Failed to update plan: ${err.message}`);
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-orange-50 border border-orange-200 text-orange-700 rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
                        >
                          <option value="starter">Starter</option>
                          <option value="growth">Growth</option>
                          <option value="pro">Pro</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          {isTrial ? (
                            <>
                              <div className="text-xs text-gray-400">Trial Ends:</div>
                              <div className="text-xs font-semibold text-gray-800">
                                {t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : 'N/A'}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-xs text-gray-400">Next Billing:</div>
                              <div className="text-xs font-semibold text-gray-800">
                                {t.nextBillingDate ? new Date(t.nextBillingDate).toLocaleDateString() : 'N/A'}
                              </div>
                              {daysLeft !== null && (
                                <div className={`text-[10px] font-medium ${daysLeft <= 3 ? 'text-rose-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-gray-400'}`}>
                                  {daysLeft < 0 ? `Overdue by ${Math.abs(daysLeft)} days` : `Renews in ${daysLeft} days`}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(t.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {/* Record payment */}
                          {t.status !== 'suspended' && (
                            <button
                              onClick={() => setSelectedTenant(t)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-xl transition"
                              title="Extend subscription by recording manual payment"
                            >
                              <Wallet size={12} />
                              <span>Log Payment</span>
                            </button>
                          )}

                          {/* Toggle active/suspended */}
                          <button
                            onClick={() => handleToggleStatus(t)}
                            className={`p-1.5 rounded-xl border transition ${
                              t.status === 'suspended'
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'
                                : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                            }`}
                            title={t.status === 'suspended' ? 'Activate Tenant' : 'Suspend Tenant'}
                          >
                            {t.status === 'suspended' ? (
                              <div className="flex items-center gap-1 px-1.5 text-xs font-semibold">
                                <ToggleLeft size={16} />
                                <span>Unsuspend</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 px-1.5 text-xs font-semibold">
                                <ToggleRight size={16} />
                                <span>Suspend</span>
                              </div>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-orange-500" />
                <h3 className="font-bold text-gray-900">Record Subscription Payment</h3>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
              <div className="bg-orange-50/50 p-3.5 rounded-2xl border border-orange-100 text-xs text-orange-800">
                <span className="font-bold">Shop:</span> {selectedTenant.shopName}
                <br />
                <span className="font-bold">Current Next Billing:</span> {selectedTenant.nextBillingDate ? new Date(selectedTenant.nextBillingDate).toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' }) : 'None'}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Amount (₱)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₱</span>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter subscription fee"
                    className="w-full pl-7 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Payment Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-orange-500"
                >
                  <option value="GCash">GCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Check">Check</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Reference Number</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. Transaction ID, Receipt reference"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Internal Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any billing notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedTenant(null)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-semibold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {savingPayment ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>Logging...</span>
                    </>
                  ) : (
                    <>
                      <DollarSign size={14} />
                      <span>Submit Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
