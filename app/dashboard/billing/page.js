'use client';
import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@/lib/UserContext';
import { PLAN_LIST } from '@/lib/constants';
import { Car, Check, CreditCard, Phone, Building2, ArrowUpCircle, Zap, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const GCASH_NUM   = process.env.NEXT_PUBLIC_GCASH_NUMBER  || '09XX-XXX-XXXX';
const GCASH_NAME  = process.env.NEXT_PUBLIC_GCASH_NAME    || 'Your Name';
const BANK_NAME   = process.env.NEXT_PUBLIC_BANK_NAME     || 'BDO';
const BANK_ACCT   = process.env.NEXT_PUBLIC_BANK_ACCT_NO  || 'XXXX-XXXX-XXXX';
const BANK_NAME2  = process.env.NEXT_PUBLIC_BANK_ACCT_NAME|| 'Your Name';
const SUPPORT     = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@autocrew.app';
const VIBER       = process.env.NEXT_PUBLIC_VIBER_NUMBER  || '+63 9XX XXX XXXX';

const STATUS_META = {
  active:      { label:'Active',       cls:'bg-emerald-100 text-emerald-700', icon:CheckCircle2 },
  trial:       { label:'Free Trial',   cls:'bg-sky-100 text-sky-700',         icon:Clock        },
  grace:       { label:'Grace Period', cls:'bg-orange-100 text-orange-700',   icon:AlertCircle  },
  trial_ended: { label:'Trial Ended',  cls:'bg-red-100 text-red-600',         icon:AlertCircle  },
  suspended:   { label:'Suspended',    cls:'bg-red-100 text-red-600',         icon:AlertCircle  },
};

const PLAN_GRAD = { starter:'from-sky-500 to-sky-600', growth:'from-violet-500 to-violet-700', pro:'from-amber-500 to-orange-500' };

export default function BillingPage() {
  const { profile, subStatus, trialDaysLeft, billingDaysLeft } = useUser();
  const [tab, setTab] = useState('gcash');

  const plansQuery = useQuery(api.plans.getList);
  const planList = plansQuery || PLAN_LIST;
  const plan = planList.find(p => p.id === profile?.plan) || planList[1];
  const sm   = STATUS_META[subStatus] || STATUS_META.active;
  const StatusIcon = sm.icon;

  const GCASH_STEPS = [
    'Open your GCash app',
    'Tap "Send Money" → "Express Send"',
    `Enter number: ${GCASH_NUM} (${GCASH_NAME})`,
    `Enter amount: ₱${plan.priceMonthly.toLocaleString()}`,
    `Reference: ${profile?.shopName || 'your shop name'}`,
    'Screenshot the confirmation',
    `Send receipt to ${VIBER} or ${SUPPORT}`,
  ];
  const BANK_STEPS = [
    'Log in to your online banking or go to any branch',
    `Transfer to: ${BANK_NAME}`,
    `Account number: ${BANK_ACCT}`,
    `Account name: ${BANK_NAME2}`,
    `Amount: ₱${plan.priceMonthly.toLocaleString()}`,
    `Reference: ${profile?.shopName || 'your shop name'}`,
    `Send receipt to ${VIBER} or ${SUPPORT}`,
  ];

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-500 mt-1 text-sm">Manage your plan and payment information</p>
      </div>

      {/* Plan card */}
      <div className={`bg-gradient-to-r ${PLAN_GRAD[plan.id]||PLAN_GRAD.growth} rounded-2xl p-6 text-white mb-6`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white/20 text-xs font-semibold px-2.5 py-1 rounded-full">{plan.name} Plan</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${sm.cls}`}>
                <StatusIcon size={11}/>{sm.label}
              </span>
            </div>
            <p className="text-4xl font-bold">₱{plan.priceMonthly.toLocaleString()}</p>
            <p className="text-white/60 text-sm mt-0.5">per month</p>
          </div>
          <Zap size={40} className="text-white/20"/>
        </div>
        <div className="mt-5 pt-4 border-t border-white/20 grid grid-cols-3 gap-4 text-sm">
          {plan.priceMonthly > 0 && subStatus === 'trial' && <div><p className="text-white/60 text-xs">Trial ends in</p><p className="font-bold">{trialDaysLeft} day{trialDaysLeft!==1?'s':''}</p></div>}
          {plan.priceMonthly > 0 && subStatus === 'active' && <div><p className="text-white/60 text-xs">Next billing</p><p className="font-bold">{billingDaysLeft===0?'Today':billingDaysLeft===1?'Tomorrow':`${billingDaysLeft} days`}</p></div>}
          {plan.priceMonthly > 0 && <div><p className="text-white/60 text-xs">Billing date</p><p className="font-bold">{profile?.nextBillingDate?new Date(profile.nextBillingDate).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}):'—'}</p></div>}
          <div><p className="text-white/60 text-xs">Branches</p><p className="font-bold">{plan.maxBranches??'Unlimited'}</p></div>
          <div><p className="text-white/60 text-xs">Installers</p><p className="font-bold">{plan.maxInstallers??'Unlimited'}</p></div>
          <div><p className="text-white/60 text-xs">Team Members</p><p className="font-bold">{plan.maxTeam??'Unlimited'}</p></div>
        </div>
      </div>

      {/* What's included */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">What's included</h2>
        <div className="grid grid-cols-2 gap-2">
          {plan.features.map(feat => (
            <div key={feat} className="flex items-center gap-2 text-sm text-gray-700">
              <Check size={14} className="text-emerald-500 flex-shrink-0"/>{feat}
            </div>
          ))}
        </div>
      </div>

      {/* Payment instructions */}
      {plan.priceMonthly > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">How to pay</h2>
          <p className="text-xs text-gray-500 mb-4">Send payment before your billing date. We'll activate within 24 hours of confirming receipt.</p>

          {/* Amount highlight */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div><p className="text-xs text-orange-600 font-medium">Amount to send</p><p className="text-3xl font-bold text-orange-600">₱{plan.priceMonthly.toLocaleString()}</p></div>
            <div className="text-right text-xs text-orange-600"><p>Reference:</p><p className="font-bold text-orange-800">{profile?.shopName || 'Your Shop Name'}</p></div>
          </div>

          {/* Tab selector */}
          <div className="flex gap-2 mb-5">
            {[{id:'gcash',label:'GCash',icon:Phone},{id:'bank',label:'Bank Transfer',icon:Building2}].map(t=>{
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={()=>setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition flex-1 justify-center ${tab===t.id?'bg-orange-500 border-orange-500 text-white':'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                  <Icon size={14}/>{t.label}
                </button>
              );
            })}
          </div>

          {tab === 'gcash' && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-sky-600 text-white rounded-xl px-5 py-3 text-center flex-shrink-0">
                  <p className="text-xs opacity-75">GCash</p>
                  <p className="text-lg font-bold tracking-widest">{GCASH_NUM}</p>
                  <p className="text-xs opacity-75">{GCASH_NAME}</p>
                </div>
                <div className="text-sm text-sky-800">
                  <p className="font-semibold mb-1">Steps:</p>
                  <ol className="space-y-0.5 text-xs">
                    {GCASH_STEPS.map((s,i)=><li key={i}>{i+1}. {s}</li>)}
                  </ol>
                </div>
              </div>
            </div>
          )}

          {tab === 'bank' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div><p className="text-xs text-emerald-600 font-medium">Bank</p><p className="font-bold text-gray-900">{BANK_NAME}</p></div>
                <div><p className="text-xs text-emerald-600 font-medium">Account Name</p><p className="font-bold text-gray-900">{BANK_NAME2}</p></div>
                <div className="col-span-2"><p className="text-xs text-emerald-600 font-medium">Account Number</p><p className="text-xl font-bold text-gray-900 tracking-widest">{BANK_ACCT}</p></div>
              </div>
              <ol className="text-xs text-gray-600 space-y-0.5">
                {BANK_STEPS.map((s,i)=><li key={i}>{i+1}. {s}</li>)}
              </ol>
            </div>
          )}

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            <p className="font-semibold mb-0.5">After payment</p>
            Send your receipt to <strong>{SUPPORT}</strong> or Viber <strong>{VIBER}</strong>. We'll activate within 24 hours.
          </div>
        </div>
      )}

      {/* Upgrade section */}
      {plan.id !== 'pro' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowUpCircle size={16} className="text-orange-500"/> Upgrade your plan
          </h2>
          <div className="space-y-3">
            {planList.filter(p => {
              const order = {starter:0,growth:1,pro:2};
              return order[p.id] > order[plan.id];
            }).map(p => (
              <div key={p.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-orange-300 transition">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{p.name} Plan</p>
                  <p className="text-xs text-gray-500">{p.features[0]}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">₱{p.priceMonthly.toLocaleString()}/mo</p>
                  <a href={`mailto:${SUPPORT}?subject=Upgrade to ${p.name}&body=Hi, I'd like to upgrade from ${plan.name} to ${p.name}.`}
                    className="text-xs text-orange-500 hover:underline font-medium">Contact to upgrade →</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
