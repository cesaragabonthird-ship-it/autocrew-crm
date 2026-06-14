'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@/lib/UserContext';
import AccessDenied from '@/components/AccessDenied';
import { Save, CheckCircle2 } from 'lucide-react';
import { payrollAPI, tenantAPI, branchesAPI } from '@/lib/convex-api';

const Section = ({title,children}) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-5">
    <h2 className="text-base font-semibold text-gray-900 mb-5 pb-3 border-b border-gray-100">{title}</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Field = ({label,children,full}) => (
  <div className={full?'col-span-1 sm:col-span-2':''}>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    {children}
  </div>
);

export default function SettingsPage() {
  const { profile } = useUser();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    shopName: 'AutoCrew Car Accessories', tagline: 'Install. Upgrade. Perform.',
    phone: '02-1234-5678', email: 'info@autocrew.com', address: '123 Main St, Pasig City',
    website: '', tin: '', currency: 'PHP', timezone: 'Asia/Manila',
    defaultLaborRate: '500', defaultTaxRate: '0', invoiceTerms: 'Due on Receipt',
    invoiceNotes: 'Thank you for choosing AutoCrew!', warrantyNote: '1 year warranty on all units.',
    gcashNumber: '', gcashName: '', bankName: 'BDO', bankAcctNo: '', bankAcctName: '',
    lowStockAlert: '5', autoAssignBranch: 'Main Branch',
    payFrequency: 'semi-monthly',
  });

  useEffect(() => {
    let alive = true;
    const fetchSettings = async () => {
      try {
        const [savedSettings, tenant, branches] = await Promise.all([
          payrollAPI.getSettings(),
          profile?.clerkId ? tenantAPI.getByUid(profile.clerkId) : null,
          profile?.tenantId ? branchesAPI.getAll() : [],
        ]);

        if (alive) {
          const merged = { ...settings };
          if (savedSettings) {
            Object.assign(merged, savedSettings);
          }
          if (tenant) {
            merged.shopName = tenant.shopName || merged.shopName;
            merged.phone = tenant.phone || merged.phone;
            merged.email = tenant.email || merged.email;
          }
          if (Array.isArray(branches)) {
            const mainBranch = branches.find(b => b.isMain);
            if (mainBranch) {
              merged.address = mainBranch.address || merged.address;
              merged.phone = mainBranch.phone || merged.phone;
              merged.email = mainBranch.email || merged.email;
            }
          }
          setSettings(merged);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchSettings();
    return () => { alive = false; };
  }, [profile?.clerkId, profile?.tenantId]);

  const set = (k,v) => setSettings(p=>({...p,[k]:v}));
  const f   = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

  if (profile && profile.role !== 'super_admin') {
    return <AccessDenied message="Settings management is restricted to Super Admins only." />;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Save general defaults/payroll/financial settings
      await payrollAPI.saveSettings(settings);

      // 2. Save shop details to the tenant document
      if (profile?.tenantId) {
        await tenantAPI.update(profile.tenantId, {
          shopName: settings.shopName,
          phone: settings.phone,
          email: settings.email,
          address: settings.address,
        });
      }

      setSaved(true);
      setTimeout(()=>setSaved(false),3000);
    } catch (err) {
      alert(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };



  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1 text-sm">Configure your shop preferences and defaults</p>
      </div>

      {saved && (
        <div className="mb-5 flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
          <CheckCircle2 size={16}/> Settings saved successfully
        </div>
      )}

      <Section title="Shop Information">
        <Field label="Shop Name" full><input type="text" value={settings.shopName} onChange={e=>set('shopName',e.target.value)} className={f}/></Field>
        <Field label="Tagline" full><input type="text" value={settings.tagline} onChange={e=>set('tagline',e.target.value)} className={f}/></Field>
        <Field label="Phone"><input type="tel" value={settings.phone} onChange={e=>set('phone',e.target.value)} className={f}/></Field>
        <Field label="Email"><input type="email" value={settings.email} onChange={e=>set('email',e.target.value)} className={f}/></Field>
        <Field label="Address" full><input type="text" value={settings.address} onChange={e=>set('address',e.target.value)} className={f}/></Field>
        <Field label="Website"><input type="url" placeholder="https://" value={settings.website} onChange={e=>set('website',e.target.value)} className={f}/></Field>
        <Field label="TIN"><input type="text" value={settings.tin} onChange={e=>set('tin',e.target.value)} className={f}/></Field>
      </Section>

      <Section title="Financial & Payroll Settings">
        <Field label="Default Labor Rate (₱/hr)"><input type="number" min="0" value={settings.defaultLaborRate} onChange={e=>set('defaultLaborRate',e.target.value)} className={f}/></Field>
        <Field label="Default Tax Rate (%)"><input type="number" min="0" max="30" step="0.01" value={settings.defaultTaxRate} onChange={e=>set('defaultTaxRate',e.target.value)} className={f}/></Field>
        <Field label="Invoice Payment Terms"><select value={settings.invoiceTerms} onChange={e=>set('invoiceTerms',e.target.value)} className={f}>{['Due on Receipt','Net 7','Net 14','Net 30'].map(t=><option key={t}>{t}</option>)}</select></Field>
        <Field label="Currency"><select value={settings.currency} onChange={e=>set('currency',e.target.value)} className={f}>{['PHP','USD','SGD'].map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="Pay Frequency / Terms" full>
          <select value={settings.payFrequency} onChange={e=>set('payFrequency',e.target.value)} className={f}>
            <option value="semi-monthly">Semi-monthly (15/30 terms)</option>
            <option value="monthly">Monthly</option>
          </select>
        </Field>
        <Field label="Invoice Footer Notes" full><textarea rows={2} value={settings.invoiceNotes} onChange={e=>set('invoiceNotes',e.target.value)} className={f+' resize-none'}/></Field>
        <Field label="Warranty Note" full><input type="text" value={settings.warrantyNote} onChange={e=>set('warrantyNote',e.target.value)} className={f}/></Field>
      </Section>

      <Section title="Payment Details">
        <Field label="GCash Number"><input type="text" placeholder="09XX-XXX-XXXX" value={settings.gcashNumber} onChange={e=>set('gcashNumber',e.target.value)} className={f}/></Field>
        <Field label="GCash Account Name"><input type="text" value={settings.gcashName} onChange={e=>set('gcashName',e.target.value)} className={f}/></Field>
        <Field label="Bank Name"><input type="text" placeholder="BDO / BPI" value={settings.bankName} onChange={e=>set('bankName',e.target.value)} className={f}/></Field>
        <Field label="Bank Account Number"><input type="text" value={settings.bankAcctNo} onChange={e=>set('bankAcctNo',e.target.value)} className={f}/></Field>
        <Field label="Bank Account Name" full><input type="text" value={settings.bankAcctName} onChange={e=>set('bankAcctName',e.target.value)} className={f}/></Field>
      </Section>

      <Section title="Inventory Settings">
        <Field label="Low Stock Alert Threshold"><input type="number" min="1" value={settings.lowStockAlert} onChange={e=>set('lowStockAlert',e.target.value)} className={f}/></Field>
        <Field label="Default Branch"><input type="text" value={settings.autoAssignBranch} onChange={e=>set('autoAssignBranch',e.target.value)} className={f}/></Field>
      </Section>

      <Section title="Preferences">
        <Field label="Timezone" full>
          <select value={settings.timezone} onChange={e=>set('timezone',e.target.value)} className={f}>
            {['Asia/Manila','Asia/Singapore','Asia/Kuala_Lumpur','UTC'].map(tz=><option key={tz}>{tz}</option>)}
          </select>
        </Field>
      </Section>

      <Section title="SMS Notifications (Coming Soon)">
        <div className="col-span-1 sm:col-span-2 flex items-start gap-3 bg-gray-50 border border-gray-200/80 rounded-xl p-4 opacity-70">
          <input type="checkbox" disabled checked={false} className="mt-1 border-gray-300 rounded text-orange-500 focus:ring-orange-500 h-4 w-4 cursor-not-allowed" />
          <div>
            <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              Enable Customer SMS Reminders
              <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded uppercase">Future Update</span>
            </p>
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
              Automatically text customers when their accessory installation is marked complete. (This feature is planned for Growth & Pro tier accounts).
            </p>
          </div>
        </div>
      </Section>


      <button onClick={handleSave} disabled={saving} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl transition disabled:opacity-50">
        <Save size={17}/> {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
