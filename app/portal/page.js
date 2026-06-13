'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@/lib/UserContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SignOutButton } from '@clerk/nextjs';
import { Clock, MapPin, Calendar, FileText, DollarSign, LogOut, ArrowRightLeft, User, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

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

export default function EmployeePortal() {
  const { profile } = useUser();
  const [activeTab, setActiveTab] = useState('clock'); // clock, attendance, payslips, advances
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');
  
  // Geolocation states
  const [coords, setCoords] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [distance, setDistance] = useState(null);
  const [withinGeofence, setWithinGeofence] = useState(false);

  // Modal / Transaction states
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advancePurpose, setAdvancePurpose] = useState('');
  const [submittingAdvance, setSubmittingAdvance] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  const tenantId = profile?.tenantId;

  // 1. Get payroll employee profile
  const employees = useQuery(api.payroll.getEmployees, tenantId ? { tenantId } : 'skip');
  const emp = employees?.find(e => e.clerkId === profile?.clerkId || e.email.toLowerCase() === profile?.email.toLowerCase());

  // 2. Get branch info
  const branches = useQuery(api.branches.getAll, tenantId ? { tenantId } : 'skip');
  const branch = branches?.find(b => b.name === emp?.branch);

  // 3. Get attendance for current month
  const today = new Date();
  const currentMonthStr = getLocalDateStr(today).slice(0, 7);
  const attendanceLogs = useQuery(api.payroll.getAttendance, emp ? {
    tenantId,
    payrollEmployeeId: emp._id,
    month: currentMonthStr
  } : 'skip');

  // 4. Get payslips
  const payslips = useQuery(api.payroll.getMyPayslips, emp ? {
    tenantId,
    payrollEmployeeId: emp._id
  } : 'skip');

  // 5. Get cash advances
  const advances = useQuery(api.payroll.getAdvances, emp ? {
    tenantId,
    payrollEmployeeId: emp._id
  } : 'skip');

  // Mutations
  const clockInOut = useMutation(api.payroll.clockInOutSelfService);
  const requestAdvance = useMutation(api.payroll.addAdvance);

  // Update clock
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

  // Monitor location when clock tab is active
  useEffect(() => {
    if (activeTab === 'clock' && branch) {
      getGPSLocation();
    }
  }, [activeTab, branch]);

  const getGPSLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoError('GPS Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setGeoLoading(false);

        // Check geofence
        if (branch?.latitude && branch?.longitude) {
          const dist = getDistanceInMeters(latitude, longitude, branch.latitude, branch.longitude);
          setDistance(Math.round(dist));
          const maxRadius = branch.geofenceRadius || 50;
          setWithinGeofence(dist <= maxRadius);
        } else {
          // No coordinates configured on branch, bypass geofence check
          setDistance(null);
          setWithinGeofence(true);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setGeoLoading(false);
        setCoords(null);
        if (error.code === 1) {
          setGeoError('Location permission denied. Please allow GPS access in settings to Clock In.');
        } else {
          setGeoError('Unable to retrieve your location. Check your GPS connection.');
        }
        setWithinGeofence(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const loadingProfile = !profile || (employees === undefined);
  const profileNotFound = profile && employees !== undefined && !emp;

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl max-w-sm text-center">
          <div className="animate-spin h-10 w-10 border-b-2 border-orange-500 rounded-full mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading employee portal details...</p>
        </div>
      </div>
    );
  }

  // Plan gate: starter plan users can't access the portal
  if (profile?.plan === 'starter') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl max-w-sm text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-orange-100 flex items-center justify-center">
            <Clock size={24} className="text-orange-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Upgrade to Access Clock In Portal</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-5">
            The Employee Clock In Portal is available on the <span className="font-semibold text-slate-700">Growth</span> plan.
            Upgrade to manage employee attendance, timekeeping, and payroll.
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

  if (profileNotFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl max-w-md text-center">
          <AlertTriangle className="text-orange-500 mx-auto mb-4" size={44} />
          <h2 className="text-lg font-black text-slate-900 mb-2">Portal Profile Not Found</h2>
          <p className="text-sm text-slate-550 leading-relaxed mb-6">
            Your login account ({profile.email}) is not linked to any payroll employee profile. 
            Please contact your branch manager or administrator to add your email in the Payroll list.
          </p>
          <SignOutButton>
            <button className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    );
  }

  // Today's attendance log
  const todayDateStr = getLocalDateStr();
  const todayLog = attendanceLogs?.find(l => l.date === todayDateStr);

  const isTimedIn = !!todayLog?.timeIn;
  const isTimedOut = !!todayLog?.timeOut;

  // Handle Clock Action
  const handleClockAction = async () => {
    setActionMessage({ type: '', text: '' });

    // Enforce geofencing check if branch has GPS set
    if (branch?.latitude && branch?.longitude && !withinGeofence) {
      setActionMessage({
        type: 'error',
        text: `Check-in blocked: You are ${distance ? `${distance}m` : 'too far'} away. You must be within ${branch.geofenceRadius || 50}m of the branch.`
      });
      return;
    }

    try {
      const now = new Date();
      const localTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

      const res = await clockInOut({
        tenantId,
        payrollEmployeeId: emp._id,
        date: todayDateStr,
        timeStr: localTimeStr,
      });

      setActionMessage({
        type: 'success',
        text: `Successfully registered ${res.action} at ${res.time}!`
      });

      // Clear message after 4s
      setTimeout(() => setActionMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setActionMessage({ type: 'error', text: cleanConvexError(err.message) });
    }
  };

  // Request Advance
  const handleRequestAdvance = async (e) => {
    e.preventDefault();
    if (!advanceAmount || Number(advanceAmount) <= 0) return;
    setSubmittingAdvance(true);

    try {
      await requestAdvance({
        payrollEmployeeId: emp._id,
        employeeId: emp.employeeId,
        employeeName: emp.name,
        amount: Number(advanceAmount),
        purpose: advancePurpose,
        amortization: Math.round(Number(advanceAmount) / 2),
        months: 2,
      });

      setAdvanceAmount('');
      setAdvancePurpose('');
      alert('Cash Advance request submitted successfully!');
    } catch (err) {
      alert(cleanConvexError(err.message));
    } finally {
      setSubmittingAdvance(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-8 selection:bg-orange-500 selection:text-white">
      {/* Top Navigation */}
      <header className="bg-[#111827] border-b border-slate-800 sticky top-0 z-40 px-4 py-3.5 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logomark-white.png" alt="AutoCrew" className="h-8 w-8 object-contain flex-shrink-0" />
            <span className="font-extrabold text-lg bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent tracking-tight">AutoCrew Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-white truncate max-w-[120px]">{emp.name}</p>
              <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">{emp.role}</p>
            </div>
            <SignOutButton>
              <button className="bg-slate-800 hover:bg-red-950/40 hover:text-red-400 p-2.5 rounded-xl border border-slate-700 text-slate-300 transition cursor-pointer">
                <LogOut size={16} />
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>

      {/* Tabs Selector */}
      <div className="bg-slate-100/50 py-3 px-4 border-b border-slate-200/80">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1 bg-slate-200/60 p-1 rounded-xl border border-slate-200/40">
          {[
            { id: 'clock', label: 'Clock', icon: Clock },
            { id: 'attendance', label: 'Logs', icon: Calendar },
            { id: 'payslips', label: 'Slips', icon: FileText },
            { id: 'advances', label: 'Advances', icon: ArrowRightLeft },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-col items-center gap-1 py-2 rounded-lg text-center cursor-pointer transition ${
                activeTab === t.id
                  ? 'bg-white text-orange-600 font-extrabold shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon size={16} />
              <span className="text-[10px]">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Body */}
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        {/* Active Tab Content */}
        {activeTab === 'clock' && (
          <div className="space-y-6">
            {/* Greetings & Clock */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm relative overflow-hidden">
              <div className="text-xs text-gray-900 font-bold tracking-tight mb-2">
                {emp.branch}
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase font-mono tracking-widest">Current Time</p>
              <h2 className="text-4xl font-black text-orange-500 my-2 tracking-tight tabular-nums">{time || '--:--:--'}</h2>
              <p className="text-xs text-slate-500 font-medium">{dateStr || 'Loading...'}</p>
            </div>

            {/* Main Action Banner */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col items-center text-center shadow-sm">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-mono font-bold mb-4">Shift Controller</p>
              
              {/* Geofence Check Banner */}
              {branch?.latitude && branch?.longitude ? (
                <div className={`mb-6 px-4 py-2.5 rounded-full border text-xs font-bold flex items-center gap-2 ${
                  geoLoading
                    ? 'bg-slate-50 border-slate-200 text-slate-500'
                    : geoError
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : withinGeofence
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  <MapPin size={14} className={geoLoading ? 'animate-pulse text-slate-400' : withinGeofence ? 'text-emerald-600' : 'text-amber-600'} />
                  {geoLoading && 'Obtaining GPS location...'}
                  {geoError && 'GPS Error: Check Permission'}
                  {!geoLoading && !geoError && withinGeofence && `Geofence Verified (${distance}m away)`}
                  {!geoLoading && !geoError && !withinGeofence && `Outside Branch Area (${distance}m away)`}
                  <button onClick={getGPSLocation} className="ml-1 bg-slate-100 hover:bg-slate-200 p-1 rounded transition text-[10px]">
                    <RefreshCw size={10} className="text-slate-600" />
                  </button>
                </div>
              ) : (
                <div className="mb-6 px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-500 flex items-center gap-2">
                  <MapPin size={14} className="text-orange-500" />
                  No geofence set for this branch
                </div>
              )}

              {/* Status Display */}
              <div className="mb-6">
                <p className="text-xs text-slate-500 font-semibold">Shift Status Today:</p>
                <div className="mt-1 flex justify-center items-center gap-2">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                    isTimedOut ? 'bg-slate-400' : isTimedIn ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`} />
                  <p className="text-lg font-bold text-slate-800">
                    {isTimedOut ? 'Shift Completed' : isTimedIn ? `Timed In (${todayLog.timeIn})` : 'Not Checked In'}
                  </p>
                </div>
              </div>

              {/* Checkin Trigger Button */}
              {isTimedOut ? (
                <button disabled className="w-full bg-slate-50 text-slate-400 text-sm font-bold py-4 rounded-2xl border border-slate-200 cursor-not-allowed">
                  Completed Shift
                </button>
              ) : (
                <button
                  onClick={handleClockAction}
                  disabled={geoLoading || (branch?.latitude && branch?.longitude && !withinGeofence)}
                  className={`w-full text-sm font-bold py-4 rounded-2xl shadow-md transition cursor-pointer select-none active:scale-[0.98] ${
                    isTimedIn
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200/10'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/10'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {geoLoading ? 'Resolving GPS...' : isTimedIn ? 'Time Out' : 'Time In'}
                </button>
              )}

              {/* Feedback messages */}
              {actionMessage.text && (
                <div className={`mt-4 w-full p-3.5 rounded-xl border flex items-start gap-2.5 text-xs text-left ${
                  actionMessage.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  {actionMessage.type === 'error' ? <AlertTriangle className="flex-shrink-0 text-red-500 mt-0.5" size={14} /> : <CheckCircle className="flex-shrink-0 text-emerald-500 mt-0.5" size={14} />}
                  <p className="leading-relaxed font-semibold">{actionMessage.text}</p>
                </div>
              )}
            </div>

            {/* Quick Links Card */}
            {profile?.role === 'installer' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                <div>
                  <h4 className="font-bold text-slate-800">View Assigned Jobs</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Manage job orders and tasks</p>
                </div>
                <a href="/installer" className="bg-orange-50 hover:bg-orange-100 text-orange-600 p-2.5 rounded-xl transition border border-orange-200/30">
                  <ArrowRightLeft size={16} />
                </a>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Calendar size={18} className="text-orange-500" />
              <span>Logs: {currentMonthStr}</span>
            </h3>
            
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-100">
                {!attendanceLogs || attendanceLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No attendance logs recorded for this month.
                  </div>
                ) : (
                  attendanceLogs.map(log => (
                    <div key={log._id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{log.date}</p>
                        <div className="flex gap-2.5 text-xs text-slate-500 mt-1 font-medium">
                          <span>In: {log.timeIn || '--'}</span>
                          <span>Out: {log.timeOut || '--'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          log.status === 'present'
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            : log.status === 'late'
                            ? 'bg-amber-50 border border-amber-200 text-amber-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                          {log.status}
                        </span>
                        {(log.otHoursRegular > 0 || log.otHoursRestDay > 0 || log.lateMinutes > 0) && (
                          <p className="text-[10px] text-slate-500 mt-1 font-mono font-medium">
                            {log.otHoursRegular > 0 && `+${log.otHoursRegular}h Reg OT `}
                            {log.otHoursRestDay > 0 && `+${log.otHoursRestDay}h Rest OT `}
                            {log.lateMinutes > 0 && `-${log.lateMinutes}m Late`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payslips' && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-orange-500" />
              <span>My Payslips</span>
            </h3>

            <div className="space-y-3">
              {!payslips || payslips.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl py-12 text-center text-slate-500 text-sm">
                  No finalized payslips available yet.
                </div>
              ) : (
                payslips.map(slip => (
                  <div key={slip._id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition flex items-center justify-between shadow-sm">
                    <div>
                      <p className="font-extrabold text-slate-800 text-sm">{slip.period}</p>
                      <p className="text-xs text-slate-500 mt-1 font-medium">Paid on {slip.payDate || 'Finalized'}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-orange-600 font-extrabold text-base">₱{slip.netPay.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Net Pay</p>
                      </div>
                      <button
                        onClick={() => setSelectedPayslip(slip)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer transition"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payslip Details Modal */}
            {selectedPayslip && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPayslip(null)}>
                <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-lg">Payslip Summary</h4>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">{selectedPayslip.period}</p>
                    </div>
                    <button onClick={() => setSelectedPayslip(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1 cursor-pointer">
                      Close
                    </button>
                  </div>

                  {/* Salary Breakdown grid */}
                  <div className="space-y-4 text-sm">
                    {/* Basic & Earnings */}
                    <div>
                      <h5 className="text-[10px] font-bold text-orange-600 uppercase tracking-widest font-mono mb-2">Earnings</h5>
                      <div className="space-y-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        {selectedPayslip.earnings?.map((earn, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="text-slate-500 text-xs font-semibold">{earn.label}</span>
                            <span className="font-bold text-slate-800">₱{earn.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900">
                          <span className="text-xs">Gross Pay</span>
                          <span>₱{selectedPayslip.grossPay.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div>
                      <h5 className="text-[10px] font-bold text-red-600 uppercase tracking-widest font-mono mb-2">Deductions</h5>
                      <div className="space-y-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        {selectedPayslip.deductions?.map((ded, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="text-slate-500 text-xs font-semibold">{ded.label}</span>
                            <span className={`font-bold ${['Tardiness', 'Cash Advance'].includes(ded.label) ? 'text-red-600' : 'text-slate-800'}`}>
                              ₱{ded.amount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900">
                          <span className="text-xs">Total Deductions</span>
                          <span className="text-red-600">₱{selectedPayslip.totalDeductions.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Pay */}
                    <div className="bg-slate-900 border border-slate-950 text-white rounded-2xl p-4 flex justify-between items-center shadow-md">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold block">Final Payout</span>
                        <span className="text-xl font-black text-orange-400">₱{selectedPayslip.netPay.toLocaleString()}</span>
                      </div>
                      <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                        Paid
                      </span>
                    </div>

                    {/* Footer Logo */}
                    <div className="flex items-center justify-center gap-1 pt-4 text-[9px] text-gray-400 font-medium select-none">
                      <span>Generated via</span>
                      <img src="/logo.png" alt="AutoCrew" className="h-3.5 object-contain" />
                      <span>Payroll System. Confidential.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'advances' && (
          <div className="space-y-6">
            {/* New Cash Advance Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                <DollarSign size={18} className="text-orange-500" />
                <span>Request Cash Advance</span>
              </h3>

              <form onSubmit={handleRequestAdvance} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Requested Amount (₱) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 5000"
                    value={advanceAmount}
                    onChange={e => setAdvanceAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500/40 rounded-xl px-3.5 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Purpose / Reason *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Emergency medical bills, educational support..."
                    value={advancePurpose}
                    onChange={e => setAdvancePurpose(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500/40 rounded-xl px-3.5 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingAdvance || !advanceAmount}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer transition select-none active:scale-[0.98] shadow-sm"
                >
                  {submittingAdvance ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </div>

            {/* Advances History */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-500 uppercase tracking-widest font-mono">Advances History</h4>
              
              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-sm">
                {!advances || advances.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No cash advances requested yet.
                  </div>
                ) : (
                  advances.map(adv => (
                    <div key={adv._id} className="p-4 flex items-center justify-between hover:bg-slate-50/20 transition">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-slate-800 text-sm">₱{adv.amount.toLocaleString()}</p>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            adv.status === 'approved'
                              ? 'bg-blue-50 border border-blue-200 text-blue-700'
                              : adv.status === 'paid'
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                              : adv.status === 'pending'
                              ? 'bg-amber-50 border border-amber-200 text-amber-700'
                              : 'bg-red-50 border border-red-200 text-red-700'
                          }`}>
                            {adv.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 truncate max-w-[200px] font-medium">{adv.purpose}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-700">Bal: ₱{adv.remainingBalance?.toLocaleString() || 0}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono font-semibold">Amort: ₱{adv.amortization?.toLocaleString() || 0}/pay</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
