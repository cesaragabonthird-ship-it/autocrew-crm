'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@/lib/UserContext';
import { remindersAPI, tenantAPI } from '@/lib/convex-api';
import {
  BellRing, Play, CheckCircle2, AlertTriangle, AlertCircle, Calendar,
  Clock, ShieldAlert, Loader2, Sparkles, UserCheck, ShieldClose
} from 'lucide-react';

const PLAN_PRICES = { starter: 0, growth: 2499, pro: 4999 };

export default function RemindersPage() {
  const { clerkId } = useUser();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runLog, setRunLog] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchTenants = async () => {
    if (!clerkId) return;
    try {
      setLoading(true);
      const res = await tenantAPI.getAll(clerkId);
      setTenants(res || []);
    } catch (err) {
      console.error('Failed to load tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [clerkId]);

  const handleRunReminders = async () => {
    if (!clerkId) return;
    try {
      setRunning(true);
      setRunLog(null);
      setErrorMsg('');
      const res = await remindersAPI.triggerDaily(clerkId);
      setRunLog(res);
      setSuccessMsg(`Daily check completed! Sent ${res.sent} reminders across ${res.total} verified accounts.`);
      fetchTenants(); // reload tenant list as some might have transitioned status
    } catch (err) {
      setErrorMsg(`Failed to run reminders: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  // Calculations
  const urgentCount = tenants.filter(t => {
    if (t.status === 'suspended') return false;
    if (!t.nextBillingDate) return false;
    const daysLeft = Math.ceil((new Date(t.nextBillingDate).getTime() - Date.now()) / 864e5);
    return daysLeft >= 0 && daysLeft <= 7;
  }).length;

  const graceCount = tenants.filter(t => t.status === 'grace').length;
  const suspendedCount = tenants.filter(t => t.status === 'suspended').length;
  
  // Sort tenants by billing status urgency
  const sortedTenants = [...tenants].sort((a, b) => {
    // Grace first, then suspended, then by days left
    if (a.status === 'grace' && b.status !== 'grace') return -1;
    if (b.status === 'grace' && a.status !== 'grace') return 1;
    
    const aDays = a.nextBillingDate ? Math.ceil((new Date(a.nextBillingDate).getTime() - Date.now()) / 864e5) : 999;
    const bDays = b.nextBillingDate ? Math.ceil((new Date(b.nextBillingDate).getTime() - Date.now()) / 864e5) : 999;
    return aDays - bDays;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reminders & Overdue Console</h1>
        <p className="text-sm text-gray-500">Monitor upcoming renewals, trigger notification e-mails manually, and track accounts in grace periods or suspension.</p>
      </div>

      {/* Message alerts */}
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

      {/* Summary grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overdue (Grace) card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">In Grace Period</span>
            <div className="text-2xl font-bold text-gray-950 mt-1">{graceCount}</div>
            <p className="text-[10px] text-gray-400 mt-0.5">Overdue but still active</p>
          </div>
          <div className={`p-3 rounded-2xl ${graceCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-50 text-gray-400'}`}>
            <AlertTriangle size={20} />
          </div>
        </div>

        {/* Urgent Renewals (<= 7 days) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Due within 7 Days</span>
            <div className="text-2xl font-bold text-gray-950 mt-1">{urgentCount}</div>
            <p className="text-[10px] text-gray-400 mt-0.5">Upcoming payment notifications</p>
          </div>
          <div className={`p-3 rounded-2xl ${urgentCount > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
            <Clock size={20} />
          </div>
        </div>

        {/* Suspended Accounts */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Suspended Accounts</span>
            <div className="text-2xl font-bold text-gray-950 mt-1">{suspendedCount}</div>
            <p className="text-[10px] text-gray-400 mt-0.5">Access suspended due to non-payment</p>
          </div>
          <div className={`p-3 rounded-2xl ${suspendedCount > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
            <ShieldAlert size={20} />
          </div>
        </div>
      </div>

      {/* Manual Trigger Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2">
            <Sparkles className="text-orange-500" size={18} />
            <h2 className="font-bold text-gray-900 text-sm">Cron Job Panel</h2>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            The subscription check runs automatically every day at 8:00 AM PHT (00:00 UTC) to send notification emails and manage suspensions. 
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Use this panel to run a manual billing audit and send email alerts immediately.
          </p>
          
          <button
            onClick={handleRunReminders}
            disabled={running}
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-bold rounded-xl text-sm shadow-md transition"
          >
            {running ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Scanning Accounts...</span>
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" />
                <span>Run Billing Check Now</span>
              </>
            )}
          </button>
        </div>

        {/* Execution Log */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BellRing className="text-gray-400" size={18} />
              <h2 className="font-bold text-gray-900 text-sm">Execution Logs</h2>
            </div>
            {runLog ? (
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-xl font-mono text-xs text-gray-700 border border-gray-150 space-y-1">
                  <div><span className="text-gray-400 font-bold">STATUS:</span> SUCCESS</div>
                  <div><span className="text-gray-400 font-bold">RECORDS PROCESSED:</span> {runLog.total}</div>
                  <div><span className="text-gray-400 font-bold">EMAILS DISPATCHED:</span> {runLog.sent}</div>
                  <div><span className="text-gray-400 font-bold">TIMESTAMP:</span> {new Date().toLocaleTimeString()}</div>
                </div>
                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>Manual sweep completed successfully without errors.</span>
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Clock size={32} className="mb-2 text-gray-200" />
                <p className="text-xs">No manual runs executed in this session yet.</p>
              </div>
            )}
          </div>
          <div className="text-[10px] text-gray-400 border-t border-gray-100 pt-3 mt-4">
            System action executes Resend API email triggers for due intervals (7, 3, 1 days prior).
          </div>
        </div>
      </div>

      {/* Tenant Urgency List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-sm">Client Billing Status Matrix</h2>
          <span className="text-xs text-gray-400">Ordered by Urgency</span>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="animate-spin text-orange-500 mb-2" size={24} />
            <p className="text-xs font-semibold text-gray-400">Loading urgency table...</p>
          </div>
        ) : sortedTenants.length === 0 ? (
          <div className="text-center py-16">
            <UserCheck size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-500 font-medium">No tenants registered yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-3.5">Client Shop</th>
                  <th className="px-6 py-3.5">Subscription Plan</th>
                  <th className="px-6 py-3.5">Next Renewal</th>
                  <th className="px-6 py-3.5">Days Remaining</th>
                  <th className="px-6 py-3.5">Billing Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedTenants.map((t) => {
                  const isTrial = t.status === 'trial';
                  const nextDate = isTrial ? t.trialEndsAt : t.nextBillingDate;
                  const daysLeft = nextDate ? Math.ceil((new Date(nextDate).getTime() - Date.now()) / 864e5) : null;
                  const planPrice = PLAN_PRICES[t.plan?.toLowerCase()] || 2499;

                  return (
                    <tr key={t._id || t.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-3.5">
                        <div className="font-bold text-gray-900">{t.shopName}</div>
                        <div className="text-[10px] text-gray-400">{t.ownerName} ({t.email})</div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-700 capitalize">{t.plan}</span>
                          <span className="text-[10px] text-gray-400">₱{planPrice.toLocaleString()}/mo</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-gray-750">
                        {nextDate ? new Date(nextDate).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' }) : '—'}
                      </td>
                      <td className="px-6 py-3.5">
                        {daysLeft === null ? (
                          <span className="text-gray-400">—</span>
                        ) : daysLeft < 0 ? (
                          <span className="text-xs font-bold text-rose-600">Overdue ({Math.abs(daysLeft)}d)</span>
                        ) : daysLeft === 0 ? (
                          <span className="text-xs font-bold text-orange-600">Due Today</span>
                        ) : (
                          <span className="text-xs font-semibold text-gray-800">{daysLeft} days</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {t.status === 'active' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <CheckCircle2 size={12} />
                            <span>Active</span>
                          </span>
                        )}
                        {t.status === 'trial' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                            <Clock size={12} />
                            <span>Trial</span>
                          </span>
                        )}
                        {t.status === 'grace' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                            <AlertTriangle size={12} />
                            <span>Grace Period</span>
                          </span>
                        )}
                        {t.status === 'suspended' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                            <ShieldClose size={12} />
                            <span>Suspended</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
