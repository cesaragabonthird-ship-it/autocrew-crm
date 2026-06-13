'use client';
import { useState, useEffect } from 'react';
import { payrollAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import { Plus, Check, X, AlertCircle } from 'lucide-react';

const EMPTY_FORM = {
  payrollEmployeeId: '',
  amount: 0,
  purpose: '',
  amortization: 0,
  months: 1,
  deductFrom: 'end_of_month',
  notes: '',
};

const f = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

export default function AdvancesTab() {
  const { profile } = useUser();
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [actioning, setActioning] = useState({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      payrollAPI.getAdvances({}).catch(() => []),
      payrollAPI.getEmployees(profile?.branchName || profile?.branchId).catch(() => []),
    ]).then(([advList, empList]) => {
      if (!alive) return;
      setAdvances(advList);
      setEmployees(empList);
      if (empList.length > 0) {
        EMPTY_FORM.payrollEmployeeId = empList[0].id || empList[0]._id;
      }
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [profile?.branchName, profile?.branchId]);

  const openAdd = () => {
    setForm({
      ...EMPTY_FORM,
      payrollEmployeeId: employees.length > 0 ? (employees[0].id || employees[0]._id) : '',
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const emp = employees.find(e => e.id === form.payrollEmployeeId || e._id === form.payrollEmployeeId);
      if (!emp) throw new Error('Selected employee not found');

      const payload = {
        payrollEmployeeId: emp.id || emp._id,
        employeeId: emp.employeeId,
        employeeName: emp.name,
        amount: Number(form.amount) || 0,
        purpose: form.purpose,
        amortization: Number(form.amortization) || 0,
        months: Number(form.months) || 1,
        deductFrom: form.deductFrom || undefined,
        notes: form.notes || undefined,
      };

      const newId = await payrollAPI.addAdvance(payload);
      setAdvances(as => [
        {
          ...payload,
          id: newId,
          _id: newId,
          status: 'pending',
          requestDate: new Date().toISOString().slice(0, 10),
          remainingBalance: payload.amount,
        },
        ...as,
      ]);
      setShowForm(false);
    } catch (err) {
      alert(err.message || 'Failed to request cash advance.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (adv, newStatus) => {
    const advId = adv.id || adv._id;
    setActioning(p => ({ ...p, [advId]: true }));
    try {
      const updateData = {
        status: newStatus,
        approvedDate: newStatus === 'approved' ? new Date().toISOString().slice(0, 10) : undefined,
      };
      await payrollAPI.updateAdvance(advId, updateData);
      setAdvances(as => as.map(a => (a.id === advId || a._id === advId) ? { ...a, ...updateData } : a));
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setActioning(p => ({ ...p, [advId]: false }));
    }
  };

  const displayAdvances = profile?.role === 'super_admin'
    ? advances
    : advances.filter(adv => employees.some(e => e.id === adv.payrollEmployeeId || e._id === adv.payrollEmployeeId));

  const totalOutstanding = displayAdvances
    .filter(a => a.status === 'approved')
    .reduce((sum, a) => sum + (a.remainingBalance || 0), 0);
  const pendingCount = displayAdvances.filter(a => a.status === 'pending').length;

  return (
    <div>
      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <p className="text-xs text-orange-800 font-semibold mb-1">Total Outstanding Cash Advances</p>
          <p className="text-2xl font-bold text-orange-950">₱{totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
          <p className="text-xs text-sky-800 font-semibold mb-1">Pending Approval Requests</p>
          <p className="text-2xl font-bold text-sky-950">{pendingCount} pending</p>
        </div>
      </div>

      {/* Subheader */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Cash Advance Tracking</h2>
          <p className="text-xs text-gray-500">Log employee cash advances, set monthly amortization payments, and manage approvals.</p>
        </div>
        {employees.length > 0 && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
          >
            <Plus size={14} /> Request Advance
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-b-2 border-orange-500 rounded-full" />
        </div>
      ) : displayAdvances.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <AlertCircle size={36} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500 font-medium">No cash advance logs found.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-xs uppercase">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3 text-center">Amount Requested</th>
                <th className="px-4 py-3 text-center">Amortization</th>
                <th className="px-4 py-3 text-center">Remaining Bal</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayAdvances.map(adv => {
                const advId = adv.id || adv._id;
                const isActioning = actioning[advId];

                return (
                  <tr key={advId} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{adv.employeeName}</p>
                      <p className="text-xs text-gray-500">Requested: {adv.requestDate}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900">
                      ₱{adv.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <p className="font-semibold text-gray-900">₱{adv.amortization.toLocaleString()} /mo</p>
                      <p className="text-[10px] text-gray-400">for {adv.months} mo</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {adv.status === 'approved' ? (
                        <span className="font-bold text-orange-600">₱{adv.remainingBalance?.toLocaleString()}</span>
                      ) : adv.status === 'paid' ? (
                        <span className="text-xs text-emerald-600 font-bold">✓ Fully Paid</span>
                      ) : (
                        <span className="text-gray-400 font-medium">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 line-clamp-1">{adv.purpose}</p>
                      {adv.notes && <p className="text-xs text-gray-400 italic line-clamp-1">Notes: {adv.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                        adv.status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                          : adv.status === 'pending' ? 'bg-amber-100 text-amber-700'
                          : adv.status === 'paid' ? 'bg-sky-105 text-sky-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {adv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {adv.status === 'pending' && profile?.role === 'super_admin' ? (
                        <div className="flex gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(adv, 'approved')}
                            disabled={isActioning}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded-md transition"
                            title="Approve Request"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(adv, 'rejected')}
                            disabled={isActioning}
                            className="bg-red-100 hover:bg-red-200 text-red-600 p-1 rounded-md transition"
                            title="Reject Request"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic font-medium">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">New Cash Advance Request</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Employee *</label>
                  <select value={form.payrollEmployeeId} onChange={e => setForm(p => ({ ...p, payrollEmployeeId: e.target.value }))} className={f}>
                    {employees.map(emp => (
                      <option key={emp.id || emp._id} value={emp.id || emp._id}>{emp.name} ({emp.employeeId})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Advance Amount (₱) *</label>
                    <input required type="number" min="1" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className={f} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Amortization (₱) *</label>
                    <input required type="number" min="1" value={form.amortization} onChange={e => setForm(p => ({ ...p, amortization: e.target.value }))} className={f} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Amortization Months *</label>
                    <input required type="number" min="1" max="60" value={form.months} onChange={e => setForm(p => ({ ...p, months: e.target.value }))} className={f} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Deduct From schedule</label>
                    <select value={form.deductFrom} onChange={e => setForm(p => ({ ...p, deductFrom: e.target.value }))} className={f}>
                      <option value="end_of_month">End of Month Pay</option>
                      <option value="semi_monthly">Semi-Monthly Pay</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Purpose *</label>
                  <input required type="text" placeholder="e.g. Personal Emergency" value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} className={f} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Additional Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={f + ' resize-none'} />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {saving ? 'Submitting…' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
