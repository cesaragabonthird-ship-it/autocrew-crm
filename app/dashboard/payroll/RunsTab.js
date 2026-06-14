'use client';
import { useState, useEffect } from 'react';
import { payrollAPI, jobsAPI } from '@/lib/convex-api';
import { useUser } from '@/lib/UserContext';
import { Receipt, Plus, Eye, Printer, ChevronRight, ClipboardList, HelpCircle, X } from 'lucide-react';

const f = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";
const fi = "px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 w-full text-right";

export default function RunsTab() {
  const { profile } = useUser();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [viewRunDetails, setViewRunDetails] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [activePayslip, setActivePayslip] = useState(null);
  const [saving, setSaving] = useState(false);

  const getEarningTotal = (label) => {
    return payslips.reduce((sum, slip) => {
      const item = (slip.earnings || []).find(e => e.label === label);
      return sum + (item ? item.amount : 0);
    }, 0);
  };

  const getDeductionTotal = (label) => {
    return payslips.reduce((sum, slip) => {
      const item = (slip.deductions || []).find(d => d.label === label);
      return sum + (item ? item.amount : 0);
    }, 0);
  };

  // Wizard State
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodName, setPeriodName] = useState('');
  const [notes, setNotes] = useState('');
  const [wizardLines, setWizardLines] = useState([]);
  const [payFrequency, setPayFrequency] = useState('semi-monthly');

  useEffect(() => {
    let alive = true;
    payrollAPI.getPayrollRuns()
      .then(list => {
        if (alive) setRuns(list.reverse());
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    payrollAPI.getSettings()
      .then(settings => {
        if (alive && settings && settings.payFrequency) {
          setPayFrequency(settings.payFrequency);
        }
      })
      .catch(console.error);

    return () => { alive = false; };
  }, []);

  const handleOpenDetails = async (run) => {
    setViewRunDetails(run);
    try {
      const slips = await payrollAPI.getPayslips({ runId: run.id || run._id });
      setPayslips(slips);
    } catch (err) {
      alert(`Error loading payslips: ${err.message}`);
    }
  };

  const handleStartWizard = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();

    if (payFrequency === 'monthly') {
      setPeriodStart(`${year}-${month}-01`);
      setPeriodEnd(`${year}-${month}-${lastDay}`);
      setPeriodName(`${today.toLocaleString('default', { month: 'long' })} ${year}`);
    } else {
      if (today.getDate() <= 15) {
        setPeriodStart(`${year}-${month}-01`);
        setPeriodEnd(`${year}-${month}-15`);
        setPeriodName(`${today.toLocaleString('default', { month: 'long' })} 1-15, ${year}`);
      } else {
        setPeriodStart(`${year}-${month}-16`);
        setPeriodEnd(`${year}-${month}-${lastDay}`);
        setPeriodName(`${today.toLocaleString('default', { month: 'long' })} 16-${lastDay}, ${year}`);
      }
    }
    setPayDate(today.toISOString().slice(0, 10));
    setWizardStep(1);
    setShowWizard(true);
  };

  const handleCalculatePayroll = async () => {
    setLoading(true);
    try {
      const [employees, attendance, advances, jobs] = await Promise.all([
        payrollAPI.getEmployees(profile?.branchName || profile?.branchId).catch(() => []),
        payrollAPI.getAttendance({ month: periodStart.slice(0, 7) }).catch(() => []),
        payrollAPI.getAdvances({ status: 'approved' }).catch(() => []),
        jobsAPI.getAll(profile?.branchName || profile?.branchId).catch(() => []),
      ]);

      const lines = employees
        .filter(emp => emp.status === 'active')
        .map(emp => {
          const empId = emp.id || emp._id;

          // Filter attendance for the date range
          const attLogs = attendance.filter(a =>
            (a.payrollEmployeeId === empId || a.payrollEmployeeId === emp.id) &&
            a.date >= periodStart &&
            a.date <= periodEnd
          );

          const daysWorked = attLogs.filter(a => ['present', 'late'].includes(a.status)).length;
          const totalLateMin = attLogs.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
          const totalRegOT = attLogs.reduce((sum, a) => sum + (a.otHoursRegular || 0), 0);
          const totalRestOT = attLogs.reduce((sum, a) => sum + (a.otHoursRestDay || 0), 0);
          const totalHolidayOT = attLogs.reduce((sum, a) => sum + (a.otHoursHoliday || 0), 0);

          // Derive rates
          let hourlyRate = emp.hourlyRate || 0;
          let dailyRate = emp.dailyRate || 0;
          let basicPay = 0;

          if (emp.payType === 'monthly') {
            if (payFrequency === 'monthly') {
              basicPay = emp.basicSalary;
              dailyRate = emp.basicSalary / 26;
              hourlyRate = dailyRate / 8;
            } else {
              basicPay = emp.basicSalary / 2; // Assume semi-monthly
              dailyRate = emp.basicSalary / 26;
              hourlyRate = dailyRate / 8;
            }
          } else if (emp.payType === 'daily') {
            dailyRate = emp.dailyRate;
            hourlyRate = dailyRate / 8;
            basicPay = daysWorked * dailyRate;
          } else if (emp.payType === 'hourly') {
            hourlyRate = emp.hourlyRate;
            basicPay = daysWorked * 8 * hourlyRate; // Assuming 8-hour shift
          }

          // Overtime calculation
          const overtimePay =
            (totalRegOT * hourlyRate * 1.25) +
            (totalRestOT * hourlyRate * 1.3) +
            (totalHolidayOT * hourlyRate * 2.0);

          // Commission calculation (Jobs completed in date range where installer is assigned)
          const matchedJobs = jobs.filter(j =>
            j.status === 'completed' &&
            j.scheduledDate &&
            j.scheduledDate >= periodStart &&
            j.scheduledDate <= periodEnd &&
            (j.assignedClerkId === emp.clerkId || j.assignedTo === emp.name)
          );
          const commission = matchedJobs.reduce((sum, j) => sum + ((j.labor || 0) * (emp.commissionRate / 100)), 0);

          // Allowances
          const allowancesSum = (emp.allowances || []).reduce((sum, a) => sum + a.amount, 0);

          // Deductions
          const tardinessDeduction = totalLateMin * (hourlyRate / 60);

          // Cash Advance amortization
          const activeAdv = advances.find(a => a.payrollEmployeeId === empId && a.remainingBalance > 0);
          const cashAdvanceDeduction = activeAdv ? Math.min(activeAdv.amortization, activeAdv.remainingBalance) : 0;

          // Government contributions (Flat rates or simplified standard values)
          const sss = emp.isSSSExempt ? 0 : Math.min(basicPay * 0.045, 1350);
          const philhealth = emp.isPhilHealthExempt ? 0 : Math.min(basicPay * 0.02, 900);
          const pagibig = emp.isPagIbigExempt ? 0 : 100;

          // Tax deduction (simplified formula: 10% of taxable income above threshold)
          const taxThreshold = payFrequency === 'monthly' ? 20833 : 10417;
          const taxableGross = basicPay + overtimePay + commission + (emp.allowances || []).filter(a => a.taxable).reduce((sum, a) => sum + a.amount, 0) - (sss + philhealth + pagibig);
          const withholdingTax = emp.isTaxExempt ? 0 : Math.max(0, (taxableGross - taxThreshold) * 0.1);

        const grossPay = basicPay + overtimePay + commission + allowancesSum;
        const totalDeductions = sss + philhealth + pagibig + withholdingTax + cashAdvanceDeduction + tardinessDeduction;
        const netPay = grossPay - totalDeductions;

        return {
          payrollEmployeeId: empId,
          employeeId: emp.employeeId,
          name: emp.name,
          basicPay: Math.round(basicPay),
          overtimePay: Math.round(overtimePay),
          commission: Math.round(commission),
          allowances: Math.round(allowancesSum),
          sss: Math.round(sss),
          philhealth: Math.round(philhealth),
          pagibig: Math.round(pagibig),
          withholdingTax: Math.round(withholdingTax),
          cashAdvanceDeduction: Math.round(cashAdvanceDeduction),
          tardinessDeduction: Math.round(tardinessDeduction),
          grossPay: Math.round(grossPay),
          totalDeductions: Math.round(totalDeductions),
          netPay: Math.round(netPay),
        };
      });

      setWizardLines(lines);
      setWizardStep(2);
    } catch (err) {
      alert(`Calculation error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLineValueChange = (idx, field, val) => {
    setWizardLines(lines => lines.map((line, i) => {
      if (i !== idx) return line;
      const updatedLine = { ...line, [field]: Number(val) || 0 };
      const grossPay = updatedLine.basicPay + updatedLine.overtimePay + updatedLine.commission + updatedLine.allowances;
      const totalDeductions = updatedLine.sss + updatedLine.philhealth + updatedLine.pagibig + updatedLine.withholdingTax + updatedLine.cashAdvanceDeduction + updatedLine.tardinessDeduction;
      const netPay = grossPay - totalDeductions;
      return { ...updatedLine, grossPay, totalDeductions, netPay };
    }));
  };

  const handleSaveRun = async () => {
    setSaving(true);
    try {
      const summary = {
        tenantId: profile?.tenantId || '',
        period: periodName,
        periodId: periodStart.slice(0, 7) + '-' + (new Date(periodStart).getDate() <= 15 ? '1' : '2'),
        periodStart,
        periodEnd,
        employees: wizardLines.length,
        grossPay: wizardLines.reduce((sum, l) => sum + l.grossPay, 0),
        netPay: wizardLines.reduce((sum, l) => sum + l.netPay, 0),
        totalSSS: wizardLines.reduce((sum, l) => sum + l.sss, 0),
        totalPhilHealth: wizardLines.reduce((sum, l) => sum + l.philhealth, 0),
        totalPagIbig: wizardLines.reduce((sum, l) => sum + l.pagibig, 0),
        totalTax: wizardLines.reduce((sum, l) => sum + l.withholdingTax, 0),
        totalDeductions: wizardLines.reduce((sum, l) => sum + l.totalDeductions, 0),
        date: payDate,
        notes: notes || undefined,
        lines: wizardLines,
      };

      const newRunId = await payrollAPI.savePayrollRun(summary);
      setRuns(rs => [{ ...summary, id: newRunId, _id: newRunId, status: 'finalized' }, ...rs]);
      setShowWizard(false);
      alert('Payroll run finalized and saved successfully!');
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Completed Payroll Runs</h2>
          <p className="text-xs text-gray-500">Run and finalize payroll periods. Generate payslips dynamically.</p>
        </div>
        <button
          onClick={handleStartWizard}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition w-full sm:w-auto"
        >
          <Plus size={14} /> Run Payroll
        </button>
      </div>

      {/* Runs history list */}
      {loading && runs.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-b-2 border-orange-500 rounded-full" />
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Receipt size={36} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500 font-medium">No payroll periods finalized yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map(run => (
            <div key={run.id || run._id} className="bg-white border border-gray-200 p-4 md:p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition">
              <div>
                <p className="font-bold text-gray-950 text-sm">{run.period}</p>
                <p className="text-xs text-gray-500 mt-0.5">Paid on: {run.date} • {run.employees} Employees</p>
                {run.notes && <p className="text-xs text-gray-400 mt-1 italic">Notes: {run.notes}</p>}
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-gray-100 pt-3 sm:border-0 sm:pt-0">
                <div className="text-left sm:text-right">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Total Net Payout</p>
                  <p className="text-base font-bold text-emerald-700">₱{run.netPay.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handleOpenDetails(run)}
                  className="flex items-center gap-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
                >
                  <Eye size={13} /> View Slips
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Run Details Modal / Payslips list */}
      {viewRunDetails && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setViewRunDetails(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-4 md:p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Payroll Run Details</h2>
                <p className="text-xs text-gray-500">Period: {viewRunDetails.period}</p>
              </div>
              <button onClick={() => setViewRunDetails(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Run Summary Grid */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Total Gross Pay</p>
                <p className="text-sm font-bold text-gray-800">₱{(viewRunDetails.grossPay || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Govt Contribs</p>
                <p className="text-sm font-bold text-gray-800">₱{((viewRunDetails.totalSSS || 0) + (viewRunDetails.totalPhilHealth || 0) + (viewRunDetails.totalPagIbig || 0)).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Total Deductions</p>
                <p className="text-sm font-bold text-gray-800">₱{(viewRunDetails.totalDeductions || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Net Payout</p>
                <p className="text-sm font-bold text-emerald-700">₱{(viewRunDetails.netPay || 0).toLocaleString()}</p>
              </div>
            </div>

            {viewRunDetails.notes && (
              <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3 mb-5 text-xs text-orange-950">
                <span className="font-semibold block mb-0.5">Run Notes:</span>
                <p className="italic text-gray-600">{viewRunDetails.notes}</p>
              </div>
            )}

            {/* Detailed Overall Breakdown Grid */}
            {payslips.length > 0 && (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 mb-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Overall Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Earnings column */}
                  <div>
                    <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-1 mb-2">Earnings</h4>
                    <div className="space-y-1.5 text-gray-600">
                      <div className="flex justify-between">
                        <span>Basic Salary</span>
                        <span className="font-semibold text-gray-900">₱{getEarningTotal("Basic Pay").toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overtime Pay</span>
                        <span className="font-semibold text-gray-900">₱{getEarningTotal("Overtime").toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Commission</span>
                        <span className="font-semibold text-gray-900">₱{getEarningTotal("Commission").toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Allowances</span>
                        <span className="font-semibold text-gray-900">₱{getEarningTotal("Allowances").toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions column */}
                  <div>
                    <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-1 mb-2">Deductions</h4>
                    <div className="space-y-1.5 text-gray-600">
                      <div className="flex justify-between">
                        <span>SSS Contribution</span>
                        <span className="font-semibold text-gray-900">₱{getDeductionTotal("SSS").toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PHealth Contribution</span>
                        <span className="font-semibold text-gray-900">₱{getDeductionTotal("PhilHealth").toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pagibig Contribution</span>
                        <span className="font-semibold text-gray-900">₱{getDeductionTotal("Pag-IBIG").toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Withholding Tax</span>
                        <span className="font-semibold text-gray-900">₱{getDeductionTotal("Withholding Tax").toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cash Advance Payment</span>
                        <span className="font-semibold text-gray-900">₱{getDeductionTotal("Cash Advance").toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tardiness Deduction</span>
                        <span className="font-semibold text-gray-900">₱{getDeductionTotal("Tardiness").toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Employee Payslips</h3>
              <div className="space-y-2.5">
                {payslips.map(slip => (
                  <div key={slip.id || slip._id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100/50 transition">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{slip.employeeName}</p>
                      <p className="text-xs text-gray-500">Gross: ₱{slip.grossPay.toLocaleString()} • Deductions: ₱{slip.totalDeductions.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-bold text-gray-900">₱{slip.netPay.toLocaleString()}</p>
                      <button
                        onClick={() => setActivePayslip(slip)}
                        className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900"
                        title="View Payslip"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Payslip Modal */}
      {activePayslip && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setActivePayslip(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 md:p-6 relative print:p-0 print:shadow-none print:inset-0 print:absolute" onClick={e => e.stopPropagation()}>
            {/* Modal Controls */}
            <div className="flex justify-between items-center mb-6 print:hidden">
              <h3 className="font-bold text-gray-900">Payslip Preview</h3>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 flex items-center gap-1 text-xs font-semibold">
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => setActivePayslip(null)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Payslip body */}
            <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 print:border-0 print:bg-white text-xs space-y-4">
              <div className="text-center pb-3 border-b border-gray-200">
                <img src="/logo.png" alt="AutoCrew" className="h-8 object-contain mx-auto mb-1.5" />
                <p className="text-gray-500">Employee Payslip</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-gray-600">
                <div><span className="font-medium">Name:</span> <strong className="text-gray-900">{activePayslip.employeeName}</strong></div>
                <div><span className="font-medium">Emp ID:</span> <strong className="text-gray-900">{activePayslip.employeeId}</strong></div>
                <div><span className="font-medium">Pay Date:</span> <span className="text-gray-900">{activePayslip.payDate}</span></div>
                <div><span className="font-medium">Period:</span> <span className="text-gray-900">{activePayslip.period}</span></div>
              </div>

              {/* Earnings */}
              <div className="border-t border-gray-200 pt-3">
                <p className="font-bold text-gray-800 uppercase mb-1.5">Earnings</p>
                <div className="space-y-1">
                  {activePayslip.earnings.map(e => (
                    <div key={e.label} className="flex justify-between text-gray-700">
                      <span>{e.label}</span>
                      <span>₱{e.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-gray-900 border-t border-dashed border-gray-200 pt-1 mt-1 text-sm">
                    <span>Gross Pay</span>
                    <span>₱{activePayslip.grossPay.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="border-t border-gray-200 pt-3">
                <p className="font-bold text-gray-800 uppercase mb-1.5">Deductions</p>
                <div className="space-y-1">
                  {activePayslip.deductions.map(d => (
                    <div key={d.label} className="flex justify-between text-gray-700">
                      <span>{d.label}</span>
                      <span>₱{d.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-gray-900 border-t border-dashed border-gray-200 pt-1 mt-1 text-sm">
                    <span>Total Deductions</span>
                    <span>₱{activePayslip.totalDeductions.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Net pay */}
              <div className="border-t border-gray-200 pt-3">
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex justify-between font-bold text-orange-950 text-sm">
                  <span>NET PAYOUT</span>
                  <span>₱{activePayslip.netPay.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1 pt-8 text-[9px] text-gray-400 font-medium select-none">
                <span>Generated via</span>
                <img src="/logo.png" alt="AutoCrew" className="h-3.5 object-contain" />
                <span>Payroll System. Confidential.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Run Payroll Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowWizard(false)}>
          <div className={`bg-white rounded-2xl shadow-2xl w-full p-6 max-h-[95vh] overflow-y-auto transition-all duration-200 ${wizardStep === 1 ? 'max-w-lg' : 'max-w-[95vw] lg:max-w-7xl'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Run Payroll Wizard</h2>
                <p className="text-xs text-gray-500">Calculate gross, deductions, and net payouts for a custom date range.</p>
              </div>
              <button onClick={() => setShowWizard(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {wizardStep === 1 ? (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Period Start</label>
                    <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className={f} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Period End</label>
                    <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className={f} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Period Display Name *</label>
                  <input required type="text" placeholder="e.g. June 1-15, 2026" value={periodName} onChange={e => setPeriodName(e.target.value)} className={f} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date *</label>
                  <input required type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className={f} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Run Notes (Optional)</label>
                  <textarea rows={2} placeholder="Add custom notes..." value={notes} onChange={e => setNotes(e.target.value)} className={f + ' resize-none'} />
                </div>
                <button
                  type="button"
                  onClick={handleCalculatePayroll}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-1.5"
                >
                  Next: Calculate & Review <ChevronRight size={15} />
                </button>
              </div>
            ) : (
              <div>
                {/* Calculated lines table */}
                <div className="overflow-x-auto border border-gray-200 rounded-xl mb-6">
                  <table className="w-full text-xs text-left min-w-[1040px] table-fixed">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                        <th className="px-3 py-2.5 w-36 min-w-[144px] whitespace-nowrap">Employee</th>
                        <th className="px-2 py-2.5 text-right w-20 whitespace-nowrap">Basic (₱)</th>
                        <th className="px-2 py-2.5 text-right w-20 whitespace-nowrap">OT (₱)</th>
                        <th className="px-2 py-2.5 text-right w-20 whitespace-nowrap">Comm. (₱)</th>
                        <th className="px-2 py-2.5 text-right w-20 whitespace-nowrap">Allow. (₱)</th>
                        <th className="px-2 py-2.5 text-right w-20 whitespace-nowrap">SSS (₱)</th>
                        <th className="px-2 py-2.5 text-right w-20 whitespace-nowrap">PHealth (₱)</th>
                        <th className="px-2 py-2.5 text-right w-20 whitespace-nowrap">Pagibig (₱)</th>
                        <th className="px-2 py-2.5 text-right w-20 whitespace-nowrap">Tax (₱)</th>
                        <th className="px-2 py-2.5 text-right w-20 whitespace-nowrap">Cash Ad (₱)</th>
                        <th className="px-2 py-2.5 text-right w-20 whitespace-nowrap">Tardy (₱)</th>
                        <th className="px-3 py-2.5 text-right w-24 whitespace-nowrap">Net Pay (₱)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {wizardLines.map((line, idx) => (
                        <tr key={line.payrollEmployeeId} className="hover:bg-gray-50 transition">
                          <td className="px-3 py-2 font-bold text-gray-900 truncate">{line.name}</td>
                          <td className="px-2 py-2"><input type="text" inputMode="numeric" pattern="[0-9]*" value={line.basicPay} onChange={e => handleLineValueChange(idx, 'basicPay', e.target.value.replace(/[^0-9]/g, ''))} className={fi} /></td>
                          <td className="px-2 py-2"><input type="text" inputMode="numeric" pattern="[0-9]*" value={line.overtimePay} onChange={e => handleLineValueChange(idx, 'overtimePay', e.target.value.replace(/[^0-9]/g, ''))} className={fi} /></td>
                          <td className="px-2 py-2"><input type="text" inputMode="numeric" pattern="[0-9]*" value={line.commission} onChange={e => handleLineValueChange(idx, 'commission', e.target.value.replace(/[^0-9]/g, ''))} className={fi} /></td>
                          <td className="px-2 py-2"><input type="text" inputMode="numeric" pattern="[0-9]*" value={line.allowances} onChange={e => handleLineValueChange(idx, 'allowances', e.target.value.replace(/[^0-9]/g, ''))} className={fi} /></td>
                          <td className="px-2 py-2"><input type="text" inputMode="numeric" pattern="[0-9]*" value={line.sss} onChange={e => handleLineValueChange(idx, 'sss', e.target.value.replace(/[^0-9]/g, ''))} className={fi} /></td>
                          <td className="px-2 py-2"><input type="text" inputMode="numeric" pattern="[0-9]*" value={line.philhealth} onChange={e => handleLineValueChange(idx, 'philhealth', e.target.value.replace(/[^0-9]/g, ''))} className={fi} /></td>
                          <td className="px-2 py-2"><input type="text" inputMode="numeric" pattern="[0-9]*" value={line.pagibig} onChange={e => handleLineValueChange(idx, 'pagibig', e.target.value.replace(/[^0-9]/g, ''))} className={fi} /></td>
                          <td className="px-2 py-2"><input type="text" inputMode="numeric" pattern="[0-9]*" value={line.withholdingTax} onChange={e => handleLineValueChange(idx, 'withholdingTax', e.target.value.replace(/[^0-9]/g, ''))} className={fi} /></td>
                          <td className="px-2 py-2"><input type="text" inputMode="numeric" pattern="[0-9]*" value={line.cashAdvanceDeduction} onChange={e => handleLineValueChange(idx, 'cashAdvanceDeduction', e.target.value.replace(/[^0-9]/g, ''))} className={fi} /></td>
                          <td className="px-2 py-2"><input type="text" inputMode="numeric" pattern="[0-9]*" value={line.tardinessDeduction} onChange={e => handleLineValueChange(idx, 'tardinessDeduction', e.target.value.replace(/[^0-9]/g, ''))} className={fi} /></td>
                          <td className="px-3 py-2 text-right font-bold text-gray-950">₱{line.netPay.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary bar */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div><p className="text-[10px] text-gray-400 uppercase font-semibold">Total Gross Pay</p><p className="text-base font-bold text-gray-800">₱{wizardLines.reduce((s,l)=>s+l.grossPay,0).toLocaleString()}</p></div>
                  <div><p className="text-[10px] text-gray-400 uppercase font-semibold">Total Deductions</p><p className="text-base font-bold text-gray-800">₱{wizardLines.reduce((s,l)=>s+l.totalDeductions,0).toLocaleString()}</p></div>
                  <div><p className="text-[10px] text-gray-400 uppercase font-semibold">Total SSS/PH/PI</p><p className="text-base font-bold text-gray-800">₱{wizardLines.reduce((s,l)=>s+l.sss+l.philhealth+l.pagibig,0).toLocaleString()}</p></div>
                  <div><p className="text-[10px] text-gray-400 uppercase font-semibold">Net Payout</p><p className="text-lg font-bold text-emerald-700">₱{wizardLines.reduce((s,l)=>s+l.netPay,0).toLocaleString()}</p></div>
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition"
                  >
                    Back to Setup
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRun}
                    disabled={saving}
                    className="w-full sm:flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition"
                  >
                    {saving ? 'Finalizing…' : 'Finalize & Save Run'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
