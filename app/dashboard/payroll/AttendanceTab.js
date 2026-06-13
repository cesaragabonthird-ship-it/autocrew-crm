'use client';
import { useState, useEffect } from 'react';
import { payrollAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import { Save, AlertCircle, Check } from 'lucide-react';

const f = "px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 w-full";

export default function AttendanceTab() {
  const { profile } = useUser();
  const isSuperAdmin = profile?.role === 'super_admin';
  const [employees, setEmployees] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [savingMap, setSavingMap] = useState({});
  const [successMap, setSuccessMap] = useState({});
  const [savedMap, setSavedMap] = useState({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // Fetch employees first
    payrollAPI.getEmployees(profile?.branchName || profile?.branchId)
      .then(async (empList) => {
        if (!alive) return;
        setEmployees(empList);

        // Fetch attendance logs for the current month/date
        const logs = await payrollAPI.getAttendance({ month: date.slice(0, 7) }).catch(() => []);
        if (!alive) return;

        // Group logs by employee date
        const initialMap = {};
        const initialSavedMap = {};
        empList.forEach(e => {
          const empId = e.id || e._id;
          const log = logs.find(l => (l.payrollEmployeeId === e._id || l.payrollEmployeeId === e.id) && l.date === date);
          initialSavedMap[empId] = !!log;
          initialMap[empId] = log ? {
            status: log.status,
            timeIn: log.timeIn || '08:00',
            timeOut: log.timeOut || '17:00',
            otHoursRegular: log.otHoursRegular ?? 0,
            otHoursRestDay: log.otHoursRestDay ?? 0,
            otHoursHoliday: log.otHoursHoliday ?? 0,
            nightDiffHours: log.nightDiffHours ?? 0,
            lateMinutes: log.lateMinutes ?? 0,
            undertimeMinutes: log.undertimeMinutes ?? 0,
            notes: log.notes || '',
          } : {
            status: 'present',
            timeIn: '08:00',
            timeOut: '17:00',
            otHoursRegular: 0,
            otHoursRestDay: 0,
            otHoursHoliday: 0,
            nightDiffHours: 0,
            lateMinutes: 0,
            undertimeMinutes: 0,
            notes: '',
          };
        });
        setAttendanceMap(initialMap);
        setSavedMap(initialSavedMap);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [profile?.branchName, profile?.branchId, date]);

  const handleStatusChange = (empId, status) => {
    setAttendanceMap(p => ({
      ...p,
      [empId]: {
        ...p[empId],
        status,
        // Reset late/undertime if absent or on leave
        ...(status === 'absent' || status === 'leave' ? { timeIn: '', timeOut: '', lateMinutes: 0, undertimeMinutes: 0, otHoursRegular: 0 } : {}),
        ...(status === 'present' && p[empId].status !== 'present' ? { timeIn: '08:00', timeOut: '17:00' } : {}),
      },
    }));
  };

  const handleFieldChange = (empId, field, val) => {
    setAttendanceMap(p => ({
      ...p,
      [empId]: {
        ...p[empId],
        [field]: val,
      },
    }));
  };

  const handleSaveRow = async (emp) => {
    const empId = emp.id || emp._id;
    setSavingMap(p => ({ ...p, [empId]: true }));
    setSuccessMap(p => ({ ...p, [empId]: false }));
    try {
      const data = attendanceMap[empId];
      const payload = {
        payrollEmployeeId: emp.id || emp._id,
        employeeId: emp.employeeId,
        date,
        status: data.status,
        timeIn: data.timeIn || undefined,
        timeOut: data.timeOut || undefined,
        otHoursRegular: Number(data.otHoursRegular) || 0,
        otHoursRestDay: Number(data.otHoursRestDay) || 0,
        otHoursHoliday: Number(data.otHoursHoliday) || 0,
        nightDiffHours: Number(data.nightDiffHours) || 0,
        lateMinutes: Number(data.lateMinutes) || 0,
        undertimeMinutes: Number(data.undertimeMinutes) || 0,
        branch: emp.branch || 'Main Branch',
        notes: data.notes || undefined,
      };
      await payrollAPI.logAttendance(payload);
      setSavedMap(p => ({ ...p, [empId]: true }));
      setSuccessMap(p => ({ ...p, [empId]: true }));
      setTimeout(() => {
        setSuccessMap(p => ({ ...p, [empId]: false }));
      }, 2000);
    } catch (err) {
      alert(`Failed to save attendance for ${emp.name}: ${err.message}`);
    } finally {
      setSavingMap(p => ({ ...p, [empId]: false }));
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      const updatedSavedMap = { ...savedMap };
      for (const emp of employees) {
        const empId = emp.id || emp._id;
        const isSaved = !!savedMap[empId];
        const isEditable = isSuperAdmin || !isSaved;
        if (!isEditable) continue;

        const data = attendanceMap[empId];
        const payload = {
          payrollEmployeeId: emp.id || emp._id,
          employeeId: emp.employeeId,
          date,
          status: data.status,
          timeIn: data.timeIn || undefined,
          timeOut: data.timeOut || undefined,
          otHoursRegular: Number(data.otHoursRegular) || 0,
          otHoursRestDay: Number(data.otHoursRestDay) || 0,
          otHoursHoliday: Number(data.otHoursHoliday) || 0,
          nightDiffHours: Number(data.nightDiffHours) || 0,
          lateMinutes: Number(data.lateMinutes) || 0,
          undertimeMinutes: Number(data.undertimeMinutes) || 0,
          branch: emp.branch || 'Main Branch',
          notes: data.notes || undefined,
        };
        await payrollAPI.logAttendance(payload);
        updatedSavedMap[empId] = true;
      }
      setSavedMap(updatedSavedMap);
      alert('All editable attendance logs saved successfully!');
    } catch (err) {
      alert(`Error saving logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Subheader */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Daily Attendance Logs</h2>
          <p className="text-xs text-gray-500">Record time-ins, tardiness, and overtime. Logs feed directly into payroll computations.</p>
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {employees.length > 0 && (
            <button
              onClick={handleSaveAll}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
            >
              <Save size={14} /> Save All Logs
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-b-2 border-orange-500 rounded-full" />
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <AlertCircle size={36} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500 font-medium">Please set up employees under the Employees tab first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-xl bg-white overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[1100px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-semibold">
                  <th className="px-4 py-3 w-48">Employee</th>
                  <th className="px-4 py-3 w-56 text-center">Status</th>
                  <th className="px-4 py-3 w-28 text-center">Clock Hours</th>
                  <th className="px-2 py-3 w-20 text-center">Late (min)</th>
                  <th className="px-2 py-3 w-20 text-center">Reg. OT (hr)</th>
                  <th className="px-2 py-3 w-32 text-center">Rest/Holid OT</th>
                  <th className="px-2 py-3 w-20 text-center">Night Diff</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map(emp => {
                  const empId = emp.id || emp._id;
                  const record = attendanceMap[empId] || {};
                  const saving = savingMap[empId];
                  const success = successMap[empId];
                  const isSaved = !!savedMap[empId];
                  const isEditable = isSuperAdmin || !isSaved;

                  return (
                    <tr key={empId} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{emp.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono uppercase">{emp.employeeId} • {emp.branch}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="grid grid-cols-4 gap-1 p-0.5 bg-gray-100 rounded-lg">
                          {['present', 'late', 'absent', 'leave'].map(st => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleStatusChange(empId, st)}
                              disabled={!isEditable}
                              className={`py-1 text-[10px] font-bold rounded capitalize transition disabled:opacity-75 disabled:cursor-not-allowed ${
                                record.status === st
                                  ? st === 'present' ? 'bg-emerald-500 text-white'
                                    : st === 'late' ? 'bg-amber-500 text-white'
                                    : st === 'absent' ? 'bg-red-500 text-white'
                                    : 'bg-indigo-500 text-white'
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {['present', 'late'].includes(record.status) ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="text"
                              value={record.timeIn}
                              disabled={!isEditable}
                              onChange={(e) => handleFieldChange(empId, 'timeIn', e.target.value)}
                              className="px-1.5 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 w-12 text-center disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                              placeholder="In"
                            />
                            <span>-</span>
                            <input
                              type="text"
                              value={record.timeOut}
                              disabled={!isEditable}
                              onChange={(e) => handleFieldChange(empId, 'timeOut', e.target.value)}
                              className="px-1.5 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 w-12 text-center disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                              placeholder="Out"
                            />
                          </div>
                        ) : (
                          <p className="text-center text-gray-400 font-semibold">—</p>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {['present', 'late'].includes(record.status) ? (
                          <input
                            type="text"
                            value={record.lateMinutes}
                            disabled={!isEditable}
                            onChange={(e) => handleFieldChange(empId, 'lateMinutes', e.target.value.replace(/[^0-9]/g, ''))}
                            onFocus={() => { if (record.lateMinutes === 0 || record.lateMinutes === '0') handleFieldChange(empId, 'lateMinutes', ''); }}
                            onBlur={() => { if (record.lateMinutes === '') handleFieldChange(empId, 'lateMinutes', 0); }}
                            className="px-1.5 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 w-16 text-center mx-auto disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                          />
                        ) : (
                          <p className="text-center text-gray-400 font-semibold">—</p>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {['present', 'late'].includes(record.status) ? (
                          <input
                            type="text"
                            value={record.otHoursRegular}
                            disabled={!isEditable}
                            onChange={(e) => handleFieldChange(empId, 'otHoursRegular', e.target.value.replace(/[^0-9.]/g, ''))}
                            onFocus={() => { if (record.otHoursRegular === 0 || record.otHoursRegular === '0') handleFieldChange(empId, 'otHoursRegular', ''); }}
                            onBlur={() => { if (record.otHoursRegular === '') handleFieldChange(empId, 'otHoursRegular', 0); }}
                            className="px-1.5 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 w-16 text-center mx-auto disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                          />
                        ) : (
                          <p className="text-center text-gray-400 font-semibold">—</p>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {['present', 'late'].includes(record.status) ? (
                          <div className="flex justify-center gap-1">
                            <input
                              type="text"
                              title="Rest Day OT"
                              placeholder="Rest"
                              value={record.otHoursRestDay}
                              disabled={!isEditable}
                              onChange={(e) => handleFieldChange(empId, 'otHoursRestDay', e.target.value.replace(/[^0-9.]/g, ''))}
                              onFocus={() => { if (record.otHoursRestDay === 0 || record.otHoursRestDay === '0') handleFieldChange(empId, 'otHoursRestDay', ''); }}
                              onBlur={() => { if (record.otHoursRestDay === '') handleFieldChange(empId, 'otHoursRestDay', 0); }}
                              className="px-1.5 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 w-12 text-center disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                            />
                            <input
                              type="text"
                              title="Holiday OT"
                              placeholder="Hol"
                              value={record.otHoursHoliday}
                              disabled={!isEditable}
                              onChange={(e) => handleFieldChange(empId, 'otHoursHoliday', e.target.value.replace(/[^0-9.]/g, ''))}
                              onFocus={() => { if (record.otHoursHoliday === 0 || record.otHoursHoliday === '0') handleFieldChange(empId, 'otHoursHoliday', ''); }}
                              onBlur={() => { if (record.otHoursHoliday === '') handleFieldChange(empId, 'otHoursHoliday', 0); }}
                              className="px-1.5 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 w-12 text-center disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                            />
                          </div>
                        ) : (
                          <p className="text-center text-gray-400 font-semibold">—</p>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {['present', 'late'].includes(record.status) ? (
                          <input
                            type="text"
                            value={record.nightDiffHours}
                            disabled={!isEditable}
                            onChange={(e) => handleFieldChange(empId, 'nightDiffHours', e.target.value.replace(/[^0-9.]/g, ''))}
                            onFocus={() => { if (record.nightDiffHours === 0 || record.nightDiffHours === '0') handleFieldChange(empId, 'nightDiffHours', ''); }}
                            onBlur={() => { if (record.nightDiffHours === '') handleFieldChange(empId, 'nightDiffHours', 0); }}
                            className="px-1.5 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 w-16 text-center mx-auto disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                          />
                        ) : (
                          <p className="text-center text-gray-400 font-semibold">—</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={record.notes}
                          disabled={!isEditable}
                          onChange={(e) => handleFieldChange(empId, 'notes', e.target.value)}
                          placeholder="Add comments..."
                          className={`${f} disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed`}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSaveRow(emp)}
                          disabled={saving || !isEditable}
                          className={`p-1.5 rounded-lg border font-semibold tracking-wide transition flex items-center justify-center w-full min-h-[26px] ${
                            !isEditable
                              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                              : success
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                        >
                          {saving ? (
                            <div className="animate-spin h-3.5 w-3.5 border-b-2 border-gray-500 rounded-full" />
                          ) : success ? (
                            <Check size={13} />
                          ) : !isEditable ? (
                            'Saved'
                          ) : (
                            'Save'
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
