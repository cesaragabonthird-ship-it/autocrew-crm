'use client';
import { useState, useEffect } from 'react';
import { payrollAPI, teamAPI, branchesAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import { Plus, Edit2, UserCheck, Shield, ClipboardList, Trash2, X } from 'lucide-react';

const EMPTY_FORM = {
  clerkId: '',
  employeeId: '',
  name: '',
  email: '',
  phone: '',
  role: 'installer',
  branch: 'Main Branch',
  department: 'Operations',
  employmentType: 'full-time',
  payType: 'monthly',
  basicSalary: 0,
  dailyRate: 0,
  hourlyRate: 0,
  commissionRate: 0,
  allowances: [],
  isSSSExempt: false,
  isPhilHealthExempt: false,
  isPagIbigExempt: false,
  isTaxExempt: false,
  hireDate: new Date().toISOString().slice(0, 10),
  status: 'active',
  pin: '',
};

const DEPARTMENTS = [
  'Executive Management',
  'Operations',
  'Sales',
  'Technical Services / Installation',
  'Customer Service',
  'Inventory & Warehouse',
  'Procurement',
  'Finance & Accounting',
  'Human Resources',
  'Information Technology (IT)',
  'Marketing',
  'Quality Assurance',
  'Logistics',
  'Business Development'
];

const f = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

export default function EmployeesTab() {
  const { profile } = useUser();
  const [employees, setEmployees] = useState([]);
  const [team, setTeam] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const unlinkedTeamMembers = team.filter(member => {
    return !employees.some(emp => 
      (emp.email && member.email && emp.email.toLowerCase() === member.email.toLowerCase()) ||
      (emp.clerkId && member.clerkId && emp.clerkId === member.clerkId)
    );
  });

  useEffect(() => {
    let alive = true;
    Promise.all([
      payrollAPI.getEmployees(profile?.branchName || profile?.branchId).catch(() => []),
      teamAPI.getAll(profile?.branchId).catch(() => []),
      branchesAPI.getAll().catch(() => []),
    ]).then(([empList, teamList, branchList]) => {
      if (!alive) return;
      setEmployees(empList);
      setTeam(teamList.filter(t => t.role !== 'super_admin')); // don't add owner to standard payroll
      setBranches(branchList);
      if (branchList.length > 0) {
        EMPTY_FORM.branch = branchList[0].name;
      }
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [profile?.branchName, profile?.branchId]);

  const openAdd = () => {
    setEditing(null);
    let nextNum = 1;
    if (employees.length > 0) {
      const ids = employees
        .map(e => {
          const match = e.employeeId?.match(/EMP-(\d+)/i);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => !isNaN(n));
      if (ids.length > 0) {
        nextNum = Math.max(...ids) + 1;
      }
    }
    const autoEmpId = `EMP-${String(nextNum).padStart(4, '0')}`;

    setForm({
      ...EMPTY_FORM,
      employeeId: autoEmpId,
      name: '',
      email: '',
      phone: '',
      role: 'installer',
      branch: branches.length > 0 ? branches[0].name : 'Main Branch',
      clerkId: '',
    });
    setShowForm(true);
  };

  const openEdit = (emp) => {
    setEditing(emp);
    setForm({
      ...EMPTY_FORM,
      ...emp,
      allowances: emp.allowances || [],
    });
    setShowForm(true);
  };

  const handleSelectTeamMember = (memberId) => {
    const member = team.find(t => t.id === memberId || t._id === memberId);
    if (!member) {
      setForm(p => ({
        ...p,
        clerkId: '',
        name: '',
        email: '',
        phone: '',
        role: 'installer',
        branch: branches.length > 0 ? branches[0].name : 'Main Branch',
      }));
      return;
    }
    setForm(p => ({
      ...p,
      clerkId: member.clerkId || member.id || member._id || '',
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      role: member.role || 'installer',
      branch: member.branch || member.branchName || 'Main Branch',
    }));
  };

  const handleAddAllowance = () => {
    setForm(p => ({
      ...p,
      allowances: [...p.allowances, { name: '', amount: 0, taxable: false }],
    }));
  };

  const handleRemoveAllowance = (idx) => {
    setForm(p => ({
      ...p,
      allowances: p.allowances.filter((_, i) => i !== idx),
    }));
  };

  const handleAllowanceChange = (idx, field, val) => {
    setForm(p => ({
      ...p,
      allowances: p.allowances.map((al, i) => i === idx ? { ...al, [field]: val } : al),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      alert('Please select a team member.');
      return;
    }
    setSaving(true);
    try {
      const { id, _id, _creationTime, tenantId, ...cleanForm } = form;
      const payload = {
        ...cleanForm,
        basicSalary: Number(form.basicSalary) || 0,
        dailyRate: Number(form.dailyRate) || 0,
        hourlyRate: Number(form.hourlyRate) || 0,
        commissionRate: Number(form.commissionRate) || 0,
        allowances: form.allowances.map(al => ({
          name: al.name,
          amount: Number(al.amount) || 0,
          taxable: !!al.taxable,
        })),
      };

      if (editing) {
        await payrollAPI.updateEmployee(editing.id || editing._id, payload);
        setEmployees(es => es.map(e => (e.id === editing.id || e._id === editing._id) ? { ...e, ...payload } : e));
      } else {
        const newId = await payrollAPI.addEmployee(payload);
        setEmployees(es => [...es, { ...payload, id: newId, _id: newId }]);
      }
      setShowForm(false);
    } catch (err) {
      alert(err.message || 'Failed to save employee settings.');
    } finally {
      setSaving(false);
    }
  };


  return (
    <div>
      {/* Subheader */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Payroll Employee Settings</h2>
          <p className="text-xs text-gray-500">Configure pay bases, taxable benefits, and exemptions for tax and contributions.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
        >
          <Plus size={14} /> Add Employee
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-b-2 border-orange-500 rounded-full" />
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Emp ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role / Dept</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Branch</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pay Basis</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No payroll employee configurations found. Add one to get started!
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id || emp._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{emp.employeeId}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{emp.role}</p>
                      <p className="text-xs text-gray-500">{emp.department} • {emp.employmentType}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{emp.branch}</td>
                    <td className="px-4 py-3">
                      {emp.payType === 'monthly' && (
                        <p className="font-semibold text-gray-900">₱{emp.basicSalary.toLocaleString()} <span className="text-xs text-gray-500 font-normal">/mo</span></p>
                      )}
                      {emp.payType === 'daily' && (
                        <p className="font-semibold text-gray-900">₱{emp.dailyRate.toLocaleString()} <span className="text-xs text-gray-500 font-normal">/day</span></p>
                      )}
                      {emp.payType === 'hourly' && (
                        <p className="font-semibold text-gray-900">₱{emp.hourlyRate.toLocaleString()} <span className="text-xs text-gray-500 font-normal">/hr</span></p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(emp)}
                        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-900 inline-block"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">{editing ? 'Edit Employee Payroll' : 'Add Employee to Payroll'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Employee ID (Auto-incremented)</label>
                  <input disabled required type="text" value={form.employeeId} className={`${f} bg-gray-100 cursor-not-allowed`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                  {editing ? (
                    <input disabled type="text" value={form.name} className={`${f} bg-gray-100 cursor-not-allowed`} />
                  ) : (
                    <select
                      required
                      value={team.find(t => t.name === form.name)?.id || team.find(t => t.name === form.name)?._id || ''}
                      onChange={e => handleSelectTeamMember(e.target.value)}
                      className={f}
                    >
                      <option value="">-- Select Team Member --</option>
                      {unlinkedTeamMembers.map(member => (
                        <option key={member.id || member._id} value={member.id || member._id}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                      {unlinkedTeamMembers.length === 0 && (
                        <option disabled value="">No unlinked team members available</option>
                      )}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                  <input disabled required type="email" value={form.email} className={`${f} bg-gray-100 cursor-not-allowed`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input disabled type="tel" value={form.phone} className={`${f} bg-gray-100 cursor-not-allowed`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                  <input disabled type="text" value={form.role} className={`${f} bg-gray-100 cursor-not-allowed`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                  <select
                    value={form.department || 'Operations'}
                    onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                    className={f}
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
                  <input disabled type="text" value={form.branch} className={`${f} bg-gray-100 cursor-not-allowed`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Employment Type</label>
                  <select value={form.employmentType} onChange={e => setForm(p => ({ ...p, employmentType: e.target.value }))} className={f}>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contractor">Contractor</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
              </div>

              {/* Pay Rates */}
              <div className="border-t border-gray-100 pt-4 mb-4">
                <h3 className="text-xs font-bold text-gray-700 uppercase mb-3">Pay Config</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Pay Type</label>
                    <select value={form.payType} onChange={e => setForm(p => ({ ...p, payType: e.target.value }))} className={f}>
                      <option value="monthly">Monthly Salary</option>
                      <option value="daily">Daily Wage</option>
                      <option value="hourly">Hourly Rate</option>
                    </select>
                  </div>
                  {form.payType === 'monthly' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Basic Monthly Salary (₱) *</label>
                      <input required type="number" min="0" value={form.basicSalary} onChange={e => setForm(p => ({ ...p, basicSalary: e.target.value }))} className={f} />
                    </div>
                  )}
                  {form.payType === 'daily' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Daily Rate (₱) *</label>
                      <input required type="number" min="0" value={form.dailyRate} onChange={e => setForm(p => ({ ...p, dailyRate: e.target.value }))} className={f} />
                    </div>
                  )}
                  {form.payType === 'hourly' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Hourly Rate (₱) *</label>
                      <input required type="number" min="0" value={form.hourlyRate} onChange={e => setForm(p => ({ ...p, hourlyRate: e.target.value }))} className={f} />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Commission Rate (%)</label>
                    <input type="number" min="0" max="100" step="0.1" value={form.commissionRate} onChange={e => setForm(p => ({ ...p, commissionRate: e.target.value }))} className={f} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Hire Date</label>
                    <input type="date" value={form.hireDate} onChange={e => setForm(p => ({ ...p, hireDate: e.target.value }))} className={f} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status *</label>
                    <select required value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={f}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Kiosk PIN (4 digits)</label>
                    <input 
                      type="text" 
                      inputMode="numeric" 
                      pattern="[0-9]*" 
                      maxLength={4} 
                      placeholder="e.g. 1234" 
                      value={form.pin || ''} 
                      onChange={e => setForm(p => ({ ...p, pin: e.target.value.replace(/[^0-9]/g, '') }))} 
                      className={f} 
                    />
                  </div>
                </div>
              </div>

              {/* Allowances */}
              <div className="border-t border-gray-100 pt-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-gray-700 uppercase">Allowances</h3>
                  <button type="button" onClick={handleAddAllowance} className="text-xs text-orange-500 hover:text-orange-700 font-semibold">+ Add Allowance</button>
                </div>
                <div className="space-y-2">
                  {form.allowances.map((al, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input type="text" required placeholder="Allowance Name" value={al.name} onChange={e => handleAllowanceChange(idx, 'name', e.target.value)} className={f + " flex-1"} />
                      <input type="number" required placeholder="Amount (₱)" min="0" value={al.amount} onChange={e => handleAllowanceChange(idx, 'amount', e.target.value)} className={f + " w-32"} />
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 px-2">
                        <input type="checkbox" checked={al.taxable} onChange={e => handleAllowanceChange(idx, 'taxable', e.target.checked)} className="rounded text-orange-500 focus:ring-orange-500 h-4 w-4" />
                        Taxable
                      </label>
                      <button type="button" onClick={() => handleRemoveAllowance(idx)} className="text-gray-400 hover:text-red-500 px-1">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {form.allowances.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No allowances configured for this employee.</p>
                  )}
                </div>
              </div>

              {/* Exemptions */}
              <div className="border-t border-gray-100 pt-4 mb-5">
                <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">Exemptions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.isSSSExempt} onChange={e => setForm(p => ({ ...p, isSSSExempt: e.target.checked }))} className="rounded text-orange-500 focus:ring-orange-500 h-4 w-4" />
                    SSS Exempt
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.isPhilHealthExempt} onChange={e => setForm(p => ({ ...p, isPhilHealthExempt: e.target.checked }))} className="rounded text-orange-500 focus:ring-orange-500 h-4 w-4" />
                    PhilHealth Exempt
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.isPagIbigExempt} onChange={e => setForm(p => ({ ...p, isPagIbigExempt: e.target.checked }))} className="rounded text-orange-500 focus:ring-orange-500 h-4 w-4" />
                    Pag-IBIG Exempt
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.isTaxExempt} onChange={e => setForm(p => ({ ...p, isTaxExempt: e.target.checked }))} className="rounded text-orange-500 focus:ring-orange-500 h-4 w-4" />
                    Tax Exempt
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editing ? 'Update Settings' : 'Add Employee'}
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
