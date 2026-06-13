'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthCompat as useAuth } from '@/components/AuthProvider';
import { useUser } from '@/lib/UserContext';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { PLAN_LIST } from '@/lib/constants';
import { Car, Phone, Building2, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';

const GCASH_NUM  = process.env.NEXT_PUBLIC_GCASH_NUMBER   || '09XX-XXX-XXXX';
const GCASH_NAME = process.env.NEXT_PUBLIC_GCASH_NAME     || 'Your Name';
const BANK_NAME  = process.env.NEXT_PUBLIC_BANK_NAME      || 'BDO';
const BANK_ACCT  = process.env.NEXT_PUBLIC_BANK_ACCT_NO   || 'XXXX-XXXX-XXXX';
const BANK_ANAME = process.env.NEXT_PUBLIC_BANK_ACCT_NAME || 'Your Name';
const SUPPORT    = process.env.NEXT_PUBLIC_SUPPORT_EMAIL  || 'support@autocrew.app';
const VIBER      = process.env.NEXT_PUBLIC_VIBER_NUMBER   || '+63 9XX XXX XXXX';

export default function SuspendedPage() {
  const { logout }                      = useAuth();
  const { profile, subStatus, trialDaysLeft, refresh } = useUser();
  const router                          = useRouter();
  const [tab, setTab]                   = useState('gcash');
  const [checking, setChecking]         = useState(false);
  const [checkedOnce, setCheckedOnce]   = useState(false);

  const plansQuery = useQuery(api.plans.getList);
  const planList = plansQuery || PLAN_LIST;
  const plan  = planList.find(p => p.id === profile?.plan) || planList[1];
  const isTrial = subStatus === 'trial_ended';

  const checkStatus = async () => {
    setChecking(true);
    await refresh();
    setTimeout(() => { setChecking(false); setCheckedOnce(true); }, 1500);
  };

  const handleLogout = async () => { await logout(); router.push('/'); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-5">
            <div className="bg-orange-500 p-2 rounded-xl"><Car size={20} className="text-white"/></div>
            <span className="text-xl font-bold text-white">AutoCrew</span>
          </div>
          <div className="bg-red-500/20 border border-red-400/30 rounded-2xl px-6 py-4 inline-block">
            <p className="text-red-300 font-bold text-lg">
              {isTrial ? 'Your free trial has ended' : 'Account Suspended'}
            </p>
            <p className="text-white/50 text-sm mt-1">
              {profile?.shopName || 'Your account'} needs a payment to continue.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Amount banner */}
          <div className="bg-orange-500 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-200">Amount due</p>
                <p className="text-4xl font-bold mt-0.5">₱{plan.priceMonthly.toLocaleString()}</p>
                <p className="text-orange-200 text-sm">{plan.name} plan · monthly</p>
              </div>
              <div className="text-right">
                <p className="text-orange-200 text-xs">Questions?</p>
                <p className="text-white text-sm font-semibold">{VIBER}</p>
                <p className="text-orange-200 text-xs">{SUPPORT}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm font-semibold text-gray-700 mb-4">Choose how to pay:</p>

            {/* Tab toggle */}
            <div className="flex gap-2 mb-5">
              {[{id:'gcash',label:'GCash',icon:Phone},{id:'bank',label:'Bank Transfer',icon:Building2}].map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition flex-1 justify-center ${tab===t.id?'bg-orange-500 border-orange-500 text-white':'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                    <Icon size={15}/>{t.label}
                  </button>
                );
              })}
            </div>

            {/* GCash */}
            {tab === 'gcash' && (
              <div className="space-y-4">
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-sky-600 text-white rounded-xl px-5 py-3 text-center flex-shrink-0">
                      <p className="text-xs opacity-75">GCash</p>
                      <p className="text-xl font-bold tracking-widest">{GCASH_NUM}</p>
                      <p className="text-xs opacity-75">{GCASH_NAME}</p>
                    </div>
                    <div className="text-sm text-sky-800">
                      <p className="font-semibold mb-2">Steps:</p>
                      <ol className="text-xs space-y-1">
                        <li>1. Open GCash → Send Money → Express Send</li>
                        <li>2. Enter: <strong>{GCASH_NUM}</strong></li>
                        <li>3. Amount: <strong>₱{plan.priceMonthly.toLocaleString()}</strong></li>
                        <li>4. Reference: <strong>{profile?.shopName || 'your shop name'}</strong></li>
                        <li>5. Screenshot and send to us</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bank */}
            {tab === 'bank' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div><p className="text-xs text-emerald-600 font-medium">Bank</p><p className="font-bold text-gray-900">{BANK_NAME}</p></div>
                  <div><p className="text-xs text-emerald-600 font-medium">Account Name</p><p className="font-bold text-gray-900">{BANK_ANAME}</p></div>
                  <div className="col-span-2">
                    <p className="text-xs text-emerald-600 font-medium">Account Number</p>
                    <p className="text-2xl font-bold text-gray-900 tracking-widest">{BANK_ACCT}</p>
                  </div>
                  <div><p className="text-xs text-emerald-600 font-medium">Amount</p><p className="text-xl font-bold text-emerald-700">₱{plan.priceMonthly.toLocaleString()}</p></div>
                  <div><p className="text-xs text-emerald-600 font-medium">Reference</p><p className="font-bold text-gray-900">{profile?.shopName || 'Shop Name'}</p></div>
                </div>
                <ol className="text-xs text-gray-600 space-y-0.5">
                  <li>1. Transfer to the account above</li>
                  <li>2. Use your shop name as reference</li>
                  <li>3. Screenshot the receipt</li>
                  <li>4. Send to us via email or Viber</li>
                </ol>
              </div>
            )}

            {/* After payment note */}
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <p className="font-semibold mb-0.5">After sending payment</p>
              Send your receipt to <strong>{SUPPORT}</strong> or Viber <strong>{VIBER}</strong> and we'll activate your account within <strong>24 hours</strong>.
            </div>

            {/* Check status feedback */}
            {checkedOnce && (
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600 text-center">
                Account still pending activation. If you've already paid, please send your receipt to <strong>{VIBER}</strong>.
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-5">
              <button onClick={checkStatus} disabled={checking}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-3 rounded-xl transition disabled:opacity-50">
                <RefreshCw size={15} className={checking ? 'animate-spin' : ''}/>
                {checking ? 'Checking…' : "I've Paid — Check Status"}
              </button>
              <button onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-3 border border-gray-300 text-gray-600 hover:border-gray-400 rounded-xl text-sm transition">
                <LogOut size={15}/> Sign out
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-white/25 text-xs mt-5">{SUPPORT} · {VIBER}</p>
      </div>
    </div>
  );
}
