'use client';
import { useState } from 'react';
import { useUser } from '@/lib/UserContext';
import AccessDenied from '@/components/AccessDenied';
import UpgradeOverlay from '@/components/UpgradeOverlay';
import EmployeesTab from './EmployeesTab';
import AttendanceTab from './AttendanceTab';
import AdvancesTab from './AdvancesTab';
import RunsTab from './RunsTab';
import { Users, Calendar, Wallet, Receipt, DollarSign, Banknote } from 'lucide-react';

const TABS = [
  { id: 'employees',  label: 'Employees',     shortLabel: 'Employees',  icon: Users },
  { id: 'attendance', label: 'Attendance',    shortLabel: 'Attendance', icon: Calendar },
  { id: 'advances',   label: 'Cash Advances', shortLabel: 'Advances',   icon: Wallet },
  { id: 'runs',       label: 'Payroll Runs',  shortLabel: 'Runs',       icon: Receipt },
];

export default function PayrollPage() {
  const { profile } = useUser();
  const [activeTab, setActiveTab] = useState('employees');

  // Plan gate: starter plan users see blurred upgrade overlay
  if (profile?.plan === 'starter') {
    return (
      <UpgradeOverlay feature="Payroll Management" icon={Banknote}>
        <div className="p-4 md:p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payroll</h1>
              <p className="text-gray-500 mt-1 text-sm">
                Manage your shop employees, attendance logging, cash advances, and generate monthly payslips.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 bg-gray-100 p-1 rounded-xl mb-6 border border-gray-200/60">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 text-[10px] sm:text-xs font-semibold text-gray-400 rounded-lg cursor-not-allowed">
                  <Icon size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">{tab.label}</span>
                  <span className="sm:hidden truncate">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 min-h-[500px]">
            <div className="space-y-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </UpgradeOverlay>
    );
  }

  if (profile && !['super_admin', 'branch_manager'].includes(profile.role)) {
    return <AccessDenied message="Payroll management is restricted to Super Admins and Branch Managers." />;
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage your shop employees, attendance logging, cash advances, and generate monthly payslips.
          </p>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="grid grid-cols-4 bg-gray-100 p-1 rounded-xl mb-6 border border-gray-200/60">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 text-[10px] sm:text-xs font-semibold rounded-lg transition-all ${
                active
                  ? 'bg-white text-orange-600 shadow-sm border border-gray-200/20'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              <Icon size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">{tab.label}</span>
              <span className="sm:hidden truncate">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content wrapper */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 min-h-[500px]">
        {activeTab === 'employees' && <EmployeesTab />}
        {activeTab === 'attendance' && <AttendanceTab />}
        {activeTab === 'advances' && <AdvancesTab />}
        {activeTab === 'runs' && <RunsTab />}
      </div>
    </div>
  );
}

