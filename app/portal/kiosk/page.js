'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@/lib/UserContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Clock, KeyRound, CheckCircle2, LogOut, AlertCircle, RefreshCw, ChevronLeft, Shield, Users, Delete } from 'lucide-react';

/** Return the local date as YYYY-MM-DD (avoids UTC shift from toISOString) */
function getLocalDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function cleanConvexError(message) {
  if (!message) return 'An unexpected error occurred.';
  const uncaughtIdx = message.indexOf('Uncaught Error:');
  if (uncaughtIdx !== -1) {
    const rawContent = message.slice(uncaughtIdx + 'Uncaught Error:'.length);
    return rawContent.split('at')[0].trim();
  }
  const errorIdx = message.indexOf('Error:');
  if (errorIdx !== -1) {
    const rawContent = message.slice(errorIdx + 'Error:'.length);
    return rawContent.split('at')[0].trim();
  }
  return message;
}

export default function KioskPage() {
  const { profile } = useUser();
  const [selectedBranch, setSelectedBranch] = useState('');
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Kiosk PIN Pad states
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [successAction, setSuccessAction] = useState(null); // { name, action, time }

  const tenantId = profile?.tenantId;

  // Real-time ticking clock
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch branches to allow selection
  const branches = useQuery(api.branches.getAll, tenantId ? { tenantId } : 'skip');

  // Auto-set branch from manager profile if set
  useEffect(() => {
    if (profile?.branchName) {
      setSelectedBranch(profile.branchName);
    } else if (branches && branches.length > 0 && !selectedBranch) {
      // Fallback: default to main branch or first branch
      const main = branches.find(b => b.isMain);
      setSelectedBranch(main ? main.name : branches[0].name);
    }
  }, [profile, branches]);

  // Fetch branch employees for kiosk
  const employees = useQuery(
    api.payroll.getBranchEmployeesForKiosk,
    tenantId && selectedBranch ? { tenantId, branch: selectedBranch } : 'skip'
  );

  const clockInOut = useMutation(api.payroll.clockInOutWithPin);

  // Auto-reset success message after 3 seconds
  useEffect(() => {
    if (successAction) {
      const timer = setTimeout(() => {
        setSuccessAction(null);
        setSelectedEmp(null);
        setPin('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successAction]);

  // Auto-reset error message after 5 seconds
  useEffect(() => {
    if (statusMessage.type === 'error') {
      const timer = setTimeout(() => {
        setStatusMessage({ type: '', text: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      setPin(p => p + num);
    }
  };

  const handleBackspace = () => {
    setPin(p => p.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setStatusMessage({ type: '', text: '' });
  };

  const handleSubmitPin = async () => {
    if (pin.length !== 4 || !selectedEmp) return;
    setLoading(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const now = new Date();
      const todayDateStr = getLocalDateStr(now);
      const localTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

      const res = await clockInOut({
        tenantId,
        payrollEmployeeId: selectedEmp.id,
        pin,
        date: todayDateStr,
        timeStr: localTimeStr,
      });

      setSuccessAction({
        name: selectedEmp.name,
        action: res.action,
        time: res.time,
        undertimeMinutes: res.undertimeMinutes || 0,
        otHoursRegular: res.otHoursRegular || 0,
        otHoursRestDay: res.otHoursRestDay || 0,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: cleanConvexError(err.message)
      });
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // Submit automatically when 4 digits are typed
  useEffect(() => {
    if (pin.length === 4) {
      handleSubmitPin();
    }
  }, [pin]);

  // Plan gate: starter plan users can't access kiosk mode
  if (profile?.plan === 'starter') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl max-w-sm text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-orange-100 flex items-center justify-center">
            <Shield size={24} className="text-orange-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Upgrade to Access Kiosk Mode</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-5">
            Branch Attendance Kiosk is available on the <span className="font-semibold text-slate-700">Growth</span> plan.
            Upgrade to enable shared kiosk-based clock in/out for your team.
          </p>
          <a href="/dashboard/billing" className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition">
            Upgrade Plan
          </a>
          <a href="/dashboard" className="block mt-3 text-xs text-slate-400 hover:text-slate-600 font-medium transition">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Lock out non-authorized users (only managers/admins can launch Kiosk Mode)
  if (profile && !['super_admin', 'branch_manager'].includes(profile.role)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm text-center shadow-xl">
          <Shield className="text-red-500 mx-auto mb-4" size={40} />
          <h2 className="text-lg font-black text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-550 leading-relaxed mb-6">
            Kiosk Mode must be launched by a Branch Manager or Super Admin account.
          </p>
          <a href="/portal" className="inline-block bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition">
            Go to My Portal
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-10 select-none animate-in fade-in duration-300">
      {/* Kiosk Header */}
      <header className="bg-[#111827] border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <img src="/logomark-white.png" alt="AutoCrew" className="h-[60px] w-[60px] object-contain flex-shrink-0" />
          <div>
            <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">Branch Attendance Kiosk</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {profile?.role === 'super_admin' && branches && branches.length > 1 ? (
                <select
                  value={selectedBranch}
                  onChange={e => setSelectedBranch(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer hover:text-white"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.name} className="bg-slate-850 text-slate-200">{b.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs font-semibold text-slate-400">{selectedBranch || 'Loading branch...'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Live Clock Display */}
        <div className="text-center md:text-right">
          <h2 className="text-2xl font-black font-mono text-orange-500 tracking-tight tabular-nums">{time || '--:--:--'}</h2>
          <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold mt-0.5">{dateStr || 'Loading date...'}</p>
        </div>
      </header>

      {/* Main Kiosk Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-700 text-sm uppercase tracking-widest font-mono flex items-center gap-2">
            <Users size={16} className="text-orange-500" />
            <span>Select Your Name to Clock In/Out</span>
          </h3>
          <a href="/portal" className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 hover:underline transition">
            <ChevronLeft size={14} /> Exit Kiosk Mode
          </a>
        </div>

        {/* Grid of employees */}
        {branches === undefined || (selectedBranch && employees === undefined) ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full" />
          </div>
        ) : !selectedBranch || employees.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl py-20 text-center text-slate-500 shadow-sm animate-in fade-in duration-300">
            <Users size={40} className="mx-auto mb-3 text-slate-400" />
            <p className="text-sm font-semibold">
              {!selectedBranch ? "No branch selected or configured." : "No active employees registered at this branch."}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {!selectedBranch ? "Please verify branch configurations in the settings." : "Configure branch assignments under the Employees settings."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-in fade-in duration-500">
            {employees.map(emp => (
              <button
                key={emp.id}
                onClick={() => {
                  setSelectedEmp(emp);
                  setPin('');
                  setStatusMessage({ type: '', text: '' });
                }}
                className="bg-white border border-slate-250 rounded-2xl p-5 hover:border-orange-500/50 hover:bg-slate-50/50 active:scale-[0.98] transition cursor-pointer text-left flex flex-col justify-between h-32 shadow-sm group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition">
                  <KeyRound size={12} className="text-orange-500/60" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 leading-tight group-hover:text-orange-600 transition truncate">{emp.name}</h4>
                  <p className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-500 mt-1 truncate">{emp.role}</p>
                </div>
                {!emp.hasPin && (
                  <span className="text-[8px] bg-red-50 border border-red-200 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase w-fit">
                    No PIN Set
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* PIN Pad overlay modal */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden">
            
            {/* Success screen */}
            {successAction ? (
              <div className="py-8 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                {successAction.action === 'Time In' ? (
                  <CheckCircle2 className="text-emerald-500 mb-4 animate-bounce" size={64} />
                ) : (
                  <LogOut className="text-orange-500 mb-4 animate-bounce" size={64} />
                )}
                <h3 className={`text-2xl font-black ${
                  successAction.action === 'Time In' ? 'text-emerald-700' : 'text-orange-700'
                }`}>
                  {successAction.action === 'Time In' ? '⏰ Clocked In!' : '👋 Clocked Out!'}
                </h3>
                <p className="text-slate-600 font-semibold mt-2">{successAction.name}</p>
                <p className={`text-sm font-bold mt-4 px-4 py-1.5 rounded-full font-mono ${
                  successAction.action === 'Time In'
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : 'text-orange-700 bg-orange-50 border border-orange-200'
                }`}>
                  {successAction.action === 'Time In' ? 'Started at' : 'Ended at'} {successAction.time}
                </p>
                {successAction.action === 'Time Out' && successAction.undertimeMinutes > 0 && (
                  <p className="text-xs text-amber-600 mt-2">Undertime: {successAction.undertimeMinutes} mins</p>
                )}
                {successAction.action === 'Time Out' && successAction.otHoursRegular > 0 && (
                  <p className="text-xs text-blue-600 mt-2">Overtime: {successAction.otHoursRegular} hrs</p>
                )}
                <p className="text-[10px] text-slate-400 mt-8 font-medium">Resetting screen in 3 seconds...</p>
              </div>
            ) : (
              // PIN entering screen
              <div className="flex flex-col items-center">
                <h3 className="font-extrabold text-lg text-slate-900 truncate w-full text-center">
                  Verify PIN for {selectedEmp.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold font-mono">Enter 4-Digit PIN</p>

                {/* PIN Dots indicators */}
                <div className="flex justify-center gap-4 my-6">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full border transition ${
                        i < pin.length
                          ? 'bg-orange-500 border-orange-500 scale-110 shadow-md shadow-orange-500/30'
                          : 'border-slate-300 bg-slate-100'
                      }`}
                    />
                  ))}
                </div>

                {/* Error Banner */}
                {statusMessage.text && (
                  <div className="w-full bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-2 text-xs text-red-700 mb-4 animate-in slide-in-from-top-1.5 duration-200">
                    <AlertCircle className="flex-shrink-0 text-red-500 mt-0.5" size={14} />
                    <p className="leading-relaxed font-semibold">{statusMessage.text}</p>
                  </div>
                )}

                {/* Numerical PIN Pad */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      onClick={() => handleKeyPress(num)}
                      disabled={loading}
                      className="bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 active:scale-95 text-slate-800 font-extrabold text-xl py-3.5 rounded-2xl cursor-pointer transition flex items-center justify-center"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={handleClear}
                    disabled={loading}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-bold text-xs py-3.5 rounded-2xl cursor-pointer transition flex items-center justify-center border border-slate-200"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => handleKeyPress(0)}
                    disabled={loading}
                    className="bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 active:scale-95 text-slate-800 font-extrabold text-xl py-3.5 rounded-2xl cursor-pointer transition flex items-center justify-center"
                  >
                    0
                  </button>
                  <button
                    onClick={handleBackspace}
                    disabled={loading}
                    className="bg-slate-50 hover:bg-slate-100 hover:text-orange-600 text-slate-500 font-bold py-3.5 rounded-2xl cursor-pointer transition flex items-center justify-center border border-slate-200"
                  >
                    <Delete size={20} />
                  </button>
                </div>

                {/* Cancel Button */}
                <button
                  onClick={() => setSelectedEmp(null)}
                  disabled={loading}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold py-2.5 rounded-xl cursor-pointer transition text-xs select-none active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
