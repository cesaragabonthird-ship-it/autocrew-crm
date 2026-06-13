'use client';
import { useState } from 'react';
import { useUser as useClerkUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { PLAN_LIST, TRIAL_DAYS } from '@/lib/constants';
import { Car, Check, ArrowRight, AlertCircle } from 'lucide-react';

const PLAN_STYLE = {
  starter: { ring:'ring-sky-400',    badge:'bg-sky-100 text-sky-700',      btn:'bg-sky-600 hover:bg-sky-700'        },
  growth:  { ring:'ring-violet-500', badge:'bg-violet-100 text-violet-700', btn:'bg-violet-600 hover:bg-violet-700', popular:true },
  pro:     { ring:'ring-amber-400',  badge:'bg-amber-100 text-amber-700',   btn:'bg-amber-500 hover:bg-amber-600'   },
};

const f = "w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

export default function OnboardingPage() {
  const { user } = useClerkUser();
  const router   = useRouter();
  const [step, setStep]     = useState(1);
  const [plan, setPlan]     = useState('growth');
  const [form, setForm]     = useState({ shopName:'', phone:'' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const createTenant  = useMutation(api.tenants.create);
  const linkToTenant  = useMutation(api.users.linkToTenant);

  const handleFinish = async (e) => {
    e.preventDefault();
    if (!form.shopName || !form.phone) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');
    try {
      const trialEndsAt     = new Date(Date.now() + TRIAL_DAYS * 864e5).toISOString();
      const nextBillingDate = trialEndsAt;
      const tenantId = await createTenant({
        clerkId:         user.id,
        shopName:        form.shopName,
        ownerName:       user.fullName || user.firstName || '',
        email:           user.primaryEmailAddress?.emailAddress || '',
        phone:           form.phone,
        plan,
        trialEndsAt,
        nextBillingDate,
      });
      await linkToTenant({
        clerkId:    user.id,
        tenantId,
        role:       'super_admin',
        branchName: 'Main Branch',
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const selectedPlan = PLAN_LIST.find(p => p.id === plan);
  const ps = PLAN_STYLE[plan];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-950 to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="bg-orange-500 p-2.5 rounded-2xl shadow-lg">
              <Car size={26} className="text-white"/>
            </div>
            <span className="text-2xl font-bold text-white">AutoCrew</span>
          </div>
          <p className="text-white/50 text-sm">Welcome, {user?.firstName}! Let&apos;s set up your shop.</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[{n:1,l:'Choose Plan'},{n:2,l:'Shop Details'},{n:3,l:'Done!'}].map((s,i)=>(
            <div key={s.n} className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition ${step>=s.n?'bg-orange-500 text-white':'bg-white/10 text-white/40'}`}>
                {step>s.n ? <Check size={13}/> : s.n}
              </div>
              <span className={`text-xs font-medium ${step>=s.n?'text-white':'text-white/30'}`}>{s.l}</span>
              {i<2 && <div className="w-8 h-px bg-white/15 mx-1"/>}
            </div>
          ))}
        </div>

        {/* Step 1 — Plan */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-white text-center mb-6">Choose your plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
              {PLAN_LIST.map(p => {
                const s = PLAN_STYLE[p.id];
                const active = plan === p.id;
                return (
                  <button key={p.id} onClick={()=>setPlan(p.id)}
                    className={`text-left rounded-2xl border-2 p-6 transition relative ${active?`ring-2 ${s.ring} bg-white border-transparent scale-[1.02] shadow-xl`:'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                    {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</div>}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${active?s.badge:'bg-white/10 text-white/50'}`}>{p.name}</span>
                    <div className="mt-4 mb-4">
                      <span className={`text-3xl font-bold ${active?'text-gray-900':'text-white'}`}>₱{p.priceMonthly.toLocaleString()}</span>
                      <span className={`text-sm ml-1 ${active?'text-gray-500':'text-white/40'}`}>/mo</span>
                    </div>
                    <ul className="space-y-2">
                      {p.features.map(feat=>(
                        <li key={feat} className={`flex items-start gap-2 text-xs ${active?'text-gray-700':'text-white/50'}`}>
                          <Check size={12} className={`flex-shrink-0 mt-0.5 ${active?'text-emerald-600':'text-white/30'}`}/>{feat}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
            <div className="text-center">
              <button onClick={()=>setStep(2)} className={`inline-flex items-center gap-2 text-white font-bold px-8 py-3.5 rounded-2xl transition text-sm ${ps.btn}`}>
                Continue with {selectedPlan?.name} <ArrowRight size={16}/>
              </button>
              <p className="text-white/30 text-xs mt-2">{TRIAL_DAYS}-day free trial. No payment until trial ends.</p>
            </div>
          </div>
        )}

        {/* Step 2 — Shop Details */}
        {step === 2 && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gray-900">Your shop details</h2>
                <button onClick={()=>setStep(1)} className="text-xs text-orange-500 hover:underline">← Change plan</button>
              </div>
              <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-5 ${ps.badge}`}>
                <Check size={12}/> {selectedPlan?.name} — ₱{selectedPlan?.priceMonthly.toLocaleString()}/mo
              </div>
              {error && (
                <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5"/>{error}
                </div>
              )}
              <form onSubmit={handleFinish} className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-3">Signed in as <strong>{user?.primaryEmailAddress?.emailAddress}</strong></p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Shop / Business Name *</label>
                  <input required type="text" value={form.shopName} onChange={e=>setForm(p=>({...p,shopName:e.target.value}))} placeholder="e.g. AutoPro Car Accessories" className={f}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone (GCash / Viber) *</label>
                  <input required type="tel" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="09XX XXX XXXX" className={f}/>
                </div>
                <button type="submit" disabled={loading} className={`w-full text-white font-bold py-3 rounded-xl transition text-sm disabled:opacity-50 flex items-center justify-center gap-2 ${ps.btn}`}>
                  {loading ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Setting up…</> : <>Start {TRIAL_DAYS}-day Free Trial <ArrowRight size={15}/></>}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
