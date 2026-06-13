'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@/lib/UserContext';
import {
  Sparkles, ShieldCheck, AlertCircle, Edit2, Check,
  Plus, Trash2, HelpCircle, Loader2, Save, X, GripVertical
} from 'lucide-react';

const PLAN_THEMES = {
  sky:    { border: 'border-sky-200', text: 'text-sky-600',    bg: 'bg-sky-50',    badge: 'bg-sky-100 text-sky-800',    gradient: 'from-sky-500 to-sky-600' },
  violet: { border: 'border-violet-200 text-violet-600', bg: 'bg-violet-50 text-violet-700', badge: 'bg-violet-100 text-violet-800', gradient: 'from-violet-500 to-violet-700' },
  amber:  { border: 'border-amber-200', text: 'text-amber-600',  bg: 'bg-amber-50',  badge: 'bg-amber-100 text-amber-800',  gradient: 'from-amber-500 to-orange-500' }
};

export default function PlansPage() {
  const { clerkId } = useUser();
  const plansData = useQuery(api.plans.getList);
  const seed = useMutation(api.plans.seed);
  const updatePlan = useMutation(api.plans.update);

  const loading = plansData === undefined;
  const plans = plansData || [];

  useEffect(() => {
    if (plansData !== undefined && plansData.length === 0) {
      seed().catch(console.error);
    }
  }, [plansData, seed]);

  const fetchPlans = () => {};

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [name, setName] = useState('');
  const [priceMonthly, setPriceMonthly] = useState(0);
  const [color, setColor] = useState('sky');
  const [popular, setPopular] = useState(false);
  const [maxBranches, setMaxBranches] = useState('1'); // 'unlimited' or number
  const [maxInstallers, setMaxInstallers] = useState('3'); // 'unlimited' or number
  const [maxProducts, setMaxProducts] = useState('100'); // 'unlimited' or number
  const [maxTeam, setMaxTeam] = useState('10'); // 'unlimited' or number
  const [features, setFeatures] = useState([]);
  const [newFeature, setNewFeature] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [draggedIndex, setDraggedIndex] = useState(null);

  const [editingFeatureIndex, setEditingFeatureIndex] = useState(null);
  const [editingFeatureValue, setEditingFeatureValue] = useState('');

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const reordered = [...features];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setFeatures(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const openEditor = (plan) => {
    setSelectedPlan(plan);
    setName(plan.name);
    setPriceMonthly(plan.priceMonthly);
    setColor(plan.color || 'sky');
    setPopular(!!plan.popular);
    setMaxBranches(plan.maxBranches === null ? 'unlimited' : String(plan.maxBranches));
    setMaxInstallers(plan.maxInstallers === null ? 'unlimited' : String(plan.maxInstallers));
    setMaxProducts(plan.maxProducts === null ? 'unlimited' : String(plan.maxProducts));
    setMaxTeam(plan.maxTeam === undefined || plan.maxTeam === null ? 'unlimited' : String(plan.maxTeam));
    setFeatures(plan.features || []);
    setNewFeature('');
    setEditingFeatureIndex(null);
    setEditingFeatureValue('');
  };

  const handleAddFeature = (e) => {
    e.preventDefault();
    if (!newFeature.trim()) return;
    setFeatures([...features, newFeature.trim()]);
    setNewFeature('');
  };

  const handleRemoveFeature = (index) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      setSaving(true);
      setErrorMsg('');

      const parsedPrice = parseFloat(priceMonthly);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        throw new Error('Please enter a valid price.');
      }

      const parsedBranches = maxBranches === 'unlimited' ? null : parseInt(maxBranches, 10);
      const parsedInstallers = maxInstallers === 'unlimited' ? null : parseInt(maxInstallers, 10);
      const parsedProducts = maxProducts === 'unlimited' ? null : parseInt(maxProducts, 10);
      const parsedTeam = maxTeam === 'unlimited' ? null : parseInt(maxTeam, 10);

      await updatePlan({
        clerkId,
        id: selectedPlan._id || selectedPlan.id,
        name,
        priceMonthly: parsedPrice,
        maxBranches: parsedBranches,
        maxInstallers: parsedInstallers,
        maxProducts: parsedProducts,
        maxTeam: parsedTeam,
        features,
        color,
        popular: popular || undefined
      });

      setSuccessMsg(`Successfully updated the "${name}" plan tier!`);
      setSelectedPlan(null);
      fetchPlans();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save plan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">SaaS Plans Editor</h1>
        <p className="text-sm text-gray-500">Configure prices, parameters, limitations, and customer-facing plan details.</p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 shadow-sm">
          <ShieldCheck className="text-emerald-500 flex-shrink-0" size={18} />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3 shadow-sm">
          <AlertCircle className="text-rose-500 flex-shrink-0" size={18} />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <Loader2 className="animate-spin text-orange-500 mb-3" size={28} />
          <p className="text-sm font-semibold text-gray-500">Loading plan structures...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((p) => {
            const theme = PLAN_THEMES[p.color] || PLAN_THEMES.sky;
            return (
              <div
                key={p._id || p.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                {/* Visual Header */}
                <div className={`bg-gradient-to-r ${theme.gradient} px-6 py-5 text-white relative`}>
                  {p.popular && (
                    <span className="absolute top-4 right-4 bg-white/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      Most Popular
                    </span>
                  )}
                  <p className="text-xs font-semibold text-white/80 uppercase tracking-widest">{p.id} tier</p>
                  <h3 className="text-2xl font-bold mt-0.5">{p.name}</h3>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-3xl font-extrabold">₱{p.priceMonthly.toLocaleString()}</span>
                    <span className="text-xs text-white/70">/ month</span>
                  </div>
                </div>

                {/* Features & Limitations info */}
                <div className="p-6 flex-1 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Usage Limits</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li className="flex justify-between">
                        <span className="text-gray-500">Branches:</span>
                        <span className="font-semibold">{p.maxBranches ?? 'Unlimited'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Installers:</span>
                        <span className="font-semibold">{p.maxInstallers ?? 'Unlimited'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Team Members:</span>
                        <span className="font-semibold">{p.maxTeam ?? 'Unlimited'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Product List:</span>
                        <span className="font-semibold">{p.maxProducts ? `${p.maxProducts} SKUs` : 'Unlimited'}</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Features Included</h4>
                    <ul className="space-y-1.5 text-xs text-gray-600">
                      {p.features.map((feat, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Database Record ID: {String(p._id || p.id).slice(0, 8)}...</span>
                  <button
                    onClick={() => openEditor(p)}
                    className="inline-flex items-center gap-1 text-xs font-bold px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md shadow-orange-500/10 transition"
                  >
                    <Edit2 size={12} />
                    <span>Configure</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-orange-500" />
                <h3 className="font-bold text-gray-900">Configure "{selectedPlan.name}" Tier</h3>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Form */}
            <form onSubmit={handleSavePlan} className="overflow-y-auto flex-1 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Plan Display Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Monthly Price (₱)</label>
                  <input
                    type="number"
                    required
                    value={priceMonthly}
                    onChange={(e) => setPriceMonthly(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Theme Accent Color</label>
                  <select
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="sky">Sky Blue Accent</option>
                    <option value="violet">Violet Accent</option>
                    <option value="amber">Amber/Orange Accent</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={popular}
                      onChange={(e) => setPopular(e.target.checked)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 h-4 w-4"
                    />
                    <span className="font-medium text-xs text-gray-500 uppercase tracking-wider">Show Popular Badge</span>
                  </label>
                </div>
              </div>

              {/* Resource Limitations */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Limitations Configuration</h4>

                {/* Branches Limit */}
                <div className="grid grid-cols-2 gap-4 items-center">
                  <span className="text-sm text-gray-600">Max Branches:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMaxBranches('unlimited')}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition ${maxBranches === 'unlimited' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      Unlimited
                    </button>
                    <input
                      type="number"
                      disabled={maxBranches === 'unlimited'}
                      value={maxBranches === 'unlimited' ? '' : maxBranches}
                      onChange={(e) => setMaxBranches(e.target.value)}
                      placeholder="Enter limit"
                      className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                {/* Installers Limit */}
                <div className="grid grid-cols-2 gap-4 items-center">
                  <span className="text-sm text-gray-600">Max Installers:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMaxInstallers('unlimited')}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition ${maxInstallers === 'unlimited' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      Unlimited
                    </button>
                    <input
                      type="number"
                      disabled={maxInstallers === 'unlimited'}
                      value={maxInstallers === 'unlimited' ? '' : maxInstallers}
                      onChange={(e) => setMaxInstallers(e.target.value)}
                      placeholder="Enter limit"
                      className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                {/* Products Limit */}
                <div className="grid grid-cols-2 gap-4 items-center">
                  <span className="text-sm text-gray-600">Max Products (SKUs):</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMaxProducts('unlimited')}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition ${maxProducts === 'unlimited' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      Unlimited
                    </button>
                    <input
                      type="number"
                      disabled={maxProducts === 'unlimited'}
                      value={maxProducts === 'unlimited' ? '' : maxProducts}
                      onChange={(e) => setMaxProducts(e.target.value)}
                      placeholder="Enter limit"
                      className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                {/* Team Limit */}
                <div className="grid grid-cols-2 gap-4 items-center">
                  <span className="text-sm text-gray-600">Max Team Members:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMaxTeam('unlimited')}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition ${maxTeam === 'unlimited' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      Unlimited
                    </button>
                    <input
                      type="number"
                      disabled={maxTeam === 'unlimited'}
                      value={maxTeam === 'unlimited' ? '' : maxTeam}
                      onChange={(e) => setMaxTeam(e.target.value)}
                      placeholder="Enter limit"
                      className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Features List builder */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Features Checklist</label>
                
                {/* List of existing */}
                 <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {features.map((feat, index) => (
                    <div
                      key={index}
                      draggable={editingFeatureIndex !== index}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 transition duration-150 select-none ${
                        draggedIndex === index
                          ? 'opacity-40 border-dashed border-orange-400 bg-orange-50/10 cursor-move'
                          : editingFeatureIndex === index
                            ? 'border-orange-200 bg-orange-50/10'
                            : 'hover:bg-gray-100/80 hover:border-gray-200 cursor-move'
                      }`}
                    >
                      {editingFeatureIndex === index ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="text"
                            value={editingFeatureValue}
                            onChange={(e) => setEditingFeatureValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (editingFeatureValue.trim()) {
                                  const updated = [...features];
                                  updated[index] = editingFeatureValue.trim();
                                  setFeatures(updated);
                                }
                                setEditingFeatureIndex(null);
                              } else if (e.key === 'Escape') {
                                setEditingFeatureIndex(null);
                              }
                            }}
                            className="flex-1 px-2 py-0.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-orange-500 bg-white"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (editingFeatureValue.trim()) {
                                const updated = [...features];
                                updated[index] = editingFeatureValue.trim();
                                setFeatures(updated);
                              }
                              setEditingFeatureIndex(null);
                            }}
                            className="text-emerald-600 hover:text-emerald-800 p-0.5 rounded transition flex-shrink-0"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingFeatureIndex(null)}
                            className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition flex-shrink-0"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <GripVertical size={13} className="text-gray-400 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                            <span className="text-xs text-gray-700 truncate">{feat}</span>
                          </div>
                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFeatureIndex(index);
                                setEditingFeatureValue(feat);
                              }}
                              className="text-gray-400 hover:text-gray-600 p-0.5 rounded-md transition"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFeature(index)}
                              className="text-rose-500 hover:text-rose-700 p-0.5 rounded-md transition"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add new feature form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add plan feature description..."
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 bg-orange-50 border border-orange-200 text-orange-600 rounded-xl hover:bg-orange-100 transition text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-semibold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Save Config</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
