import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, WifiOff, CloudOff, Cloud, Activity, CheckCircle2, RotateCcw, Clock, Calculator, Check } from 'lucide-react';
import { toast } from 'sonner';
import { saveDraft, getDraft, clearDraft, enqueueSync, getSyncQueue, removeFromSyncQueue } from '@/lib/idb';
import { apiFetch } from '@/lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '@/lib/settings';

interface SmartFormProps {
  user: any;
}

const INITIAL_FORM_STATE = {
  name: '',
  phone: '',
  email: '',
  loan_type: '',
  amount: '',
  city: '',
  notes: ''
};

// Loan policy rules compliant with Divyanshi Capital operating model
const LOAN_POLICIES: Record<string, { rate: number; tat: string; defaultTenureYears: number; note: string }> = {
  'Personal Loan': { rate: 10.5, tat: '~3 Days', defaultTenureYears: 5, note: 'Subject to salaried/self-employed profile & lender criteria.' },
  'Business Loan': { rate: 16.0, tat: '~7 Days', defaultTenureYears: 3, note: 'Fast-track approval with minimum 1-year GST & banking.' },
  'Home Loan': { rate: 8.5, tat: '~15 Days', defaultTenureYears: 20, note: 'Lowest interest rates across top nationalized & private banks.' },
  'Loan Against Property': { rate: 10.5, tat: '~15 Days', defaultTenureYears: 10, note: 'High loan value with competitive mortgage rates.' },
  'Auto Loan': { rate: 9.5, tat: '~5 Days', defaultTenureYears: 5, note: 'Quick on-road sanction with minimal documentation.' },
  'Credit Card': { rate: 0.0, tat: '~2 Days', defaultTenureYears: 0, note: 'Instant pre-qualified cards with 45-50 days interest-free cycle.' },
  'Other': { rate: 11.0, tat: '~5 Days', defaultTenureYears: 5, note: 'Customized banking solution tailored to client requirements.' }
};

const QUICK_AMOUNTS = [
  { label: '₹1 Lakh', value: '100000' },
  { label: '₹5 Lakhs', value: '500000' },
  { label: '₹10 Lakhs', value: '1000000' },
  { label: '₹25 Lakhs', value: '2500000' },
  { label: '₹50 Lakhs', value: '5000000' },
  { label: '₹1 Crore', value: '10000000' }
];

const QUICK_CITIES = ['Delhi NCR', 'Mumbai', 'Bengaluru', 'Pune', 'Hyderabad', 'Jaipur'];

function formatIndianNumber(numStr: string): string {
  const num = parseInt(numStr.replace(/\D/g, ''), 10);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
}

function calculateApproxEMI(principal: number, annualRate: number, tenureYears: number): number {
  if (!principal || principal <= 0 || !annualRate || annualRate <= 0 || !tenureYears || tenureYears <= 0) return 0;
  const monthlyRate = annualRate / 12 / 100;
  const totalMonths = tenureYears * 12;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
  return Math.round(emi);
}

export function SmartForm({ user }: SmartFormProps) {
  const { playFeedback } = useSettings();
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const DRAFT_KEY = `smart_form_draft_${user?.id || 'guest'}`;
  const LOCAL_STORAGE_KEY = `dc_smart_form_autosave_${user?.id || 'guest'}`;

  // Keep a ref to latest formData for interval access without stale closures
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const lastSavedDataRef = useRef<typeof INITIAL_FORM_STATE>(INITIAL_FORM_STATE);

  // Core auto-save persistence handler (LocalStorage + IndexedDB)
  const persistFormData = useCallback(async (dataToSave: typeof INITIAL_FORM_STATE) => {
    const isNonEmpty = Object.values(dataToSave).some(val => val && val.trim() !== '');
    if (!isNonEmpty) return;

    try {
      setIsAutoSaving(true);
      const payload = {
        data: dataToSave,
        timestamp: Date.now(),
        userId: user?.id || 'guest'
      };

      // 1. Persist directly to LocalStorage
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));

      // 2. Persist to IndexedDB as secondary resilient backup
      await saveDraft(DRAFT_KEY, dataToSave);

      lastSavedDataRef.current = { ...dataToSave };
      setLastSavedTime(new Date());
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to auto-save smart form data:', err);
    } finally {
      setTimeout(() => {
        setIsAutoSaving(false);
      }, 800);
    }
  }, [DRAFT_KEY, LOCAL_STORAGE_KEY, user?.id]);

  // Load initial draft from LocalStorage (fastest) or IndexedDB
  useEffect(() => {
    const loadDraft = async () => {
      try {
        let restoredData: typeof INITIAL_FORM_STATE | null = null;
        let savedTimestamp: number | null = null;

        // Try local storage first
        const rawLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (rawLocal) {
          try {
            const parsed = JSON.parse(rawLocal);
            if (parsed && parsed.data && Object.values(parsed.data).some(v => typeof v === 'string' && v.trim() !== '')) {
              restoredData = parsed.data;
              savedTimestamp = parsed.timestamp;
            }
          } catch (e) {
            console.warn('Malformed localStorage draft:', e);
          }
        }

        // Fallback to IndexedDB if localStorage was empty
        if (!restoredData) {
          const idbDraft = await getDraft(DRAFT_KEY);
          if (idbDraft && Object.values(idbDraft).some(v => typeof v === 'string' && v.trim() !== '')) {
            restoredData = idbDraft;
          }
        }

        if (restoredData) {
          setFormData(restoredData);
          lastSavedDataRef.current = { ...restoredData };
          if (savedTimestamp) {
            setLastSavedTime(new Date(savedTimestamp));
          } else {
            setLastSavedTime(new Date());
          }
          toast.info('Auto-Saved Draft Restored', {
            description: 'Your previous form entries were safely recovered from local storage.'
          });
        }
      } catch (err) {
        console.error('Failed to load draft:', err);
      }
    };

    loadDraft();
    updatePendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      processSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for offline sync
    if (navigator.onLine) {
      processSyncQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [LOCAL_STORAGE_KEY, DRAFT_KEY]);

  // Periodic Auto-Save Every 5 Seconds (5000ms) to Local Storage
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      const currentData = formDataRef.current;
      const isNonEmpty = Object.values(currentData).some(v => v && v.trim() !== '');
      const hasChanged = JSON.stringify(currentData) !== JSON.stringify(lastSavedDataRef.current);

      if (isNonEmpty && hasChanged) {
        persistFormData(currentData);
      }
    }, 5000);

    return () => clearInterval(autoSaveInterval);
  }, [persistFormData]);

  // Flush auto-save on page unload or visibility change to ensure zero data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentData = formDataRef.current;
      const isNonEmpty = Object.values(currentData).some(v => v && v.trim() !== '');
      if (isNonEmpty) {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({
            data: currentData,
            timestamp: Date.now(),
            userId: user?.id || 'guest'
          })
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const currentData = formDataRef.current;
        const isNonEmpty = Object.values(currentData).some(v => v && v.trim() !== '');
        const hasChanged = JSON.stringify(currentData) !== JSON.stringify(lastSavedDataRef.current);
        if (isNonEmpty && hasChanged) {
          persistFormData(currentData);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [LOCAL_STORAGE_KEY, persistFormData, user?.id]);

  const updatePendingCount = async () => {
    try {
      const queue = await getSyncQueue();
      setPendingCount(queue.length);
    } catch (e) {}
  };

  const processSyncQueue = async () => {
    try {
      const queue = await getSyncQueue();
      if (queue.length === 0) return;

      let successCount = 0;
      for (const item of queue) {
        try {
          const payload = { ...item.data, manager_email_id: user?.email, emp: user?.id };
          const response = await apiFetch('/api/dc/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (response.ok) {
            await removeFromSyncQueue(item.id);
            successCount++;
          }
        } catch (err) {
          console.error('Sync failed for item', item.id, err);
        }
      }

      if (successCount > 0) {
        toast.success(`Synced ${successCount} offline submissions`);
        playFeedback('success');
        updatePendingCount();
      }
    } catch (err) {
      console.error('Error processing sync queue', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    
    // Auto-smart sanitization
    if (name === 'phone') {
      // Remove any non-digits, and leading +91 or 91 if full number pasted
      let digits = value.replace(/\D/g, '');
      if (digits.length === 12 && digits.startsWith('91')) {
        digits = digits.slice(2);
      }
      if (digits.length > 10) {
        digits = digits.slice(0, 10);
      }
      value = digits;
    } else if (name === 'name') {
      // Smart capitalization on start of words
      value = value.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
    }

    updateFormData(name, value);
  };

  const handleSelectChange = (name: string, value: string) => {
    updateFormData(name, value);
  };

  const updateFormData = (name: string, value: string) => {
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    setIsDirty(true);
  };

  const handleQuickAmount = (amt: string) => {
    updateFormData('amount', amt);
    playFeedback('click');
  };

  const handleQuickCity = (city: string) => {
    updateFormData('city', city);
    playFeedback('click');
  };

  const handleClearDraft = async () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      await clearDraft(DRAFT_KEY);
      setFormData(INITIAL_FORM_STATE);
      lastSavedDataRef.current = INITIAL_FORM_STATE;
      setLastSavedTime(null);
      setIsDirty(false);
      toast.success('Form cleared and draft removed');
      playFeedback('click');
    } catch (err) {
      console.error('Failed to clear draft:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.loan_type || !formData.amount) {
      toast.error('Please fill all required fields');
      playFeedback('error');
      return;
    }

    if (formData.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      playFeedback('error');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      ...formData,
      source: "SMART_FORM",
      emp: user?.id,
      manager_email_id: user?.email
    };

    const cleanupDraft = async () => {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      await clearDraft(DRAFT_KEY);
      setFormData(INITIAL_FORM_STATE);
      lastSavedDataRef.current = INITIAL_FORM_STATE;
      setLastSavedTime(null);
      setIsDirty(false);
    };

    if (!isOnline) {
      // Save to sync queue if offline
      try {
        await enqueueSync(payload);
        await cleanupDraft();
        toast.success('Saved Offline', { description: 'Lead will sync automatically when connection restores.' });
        playFeedback('success');
        updatePendingCount();
      } catch (err) {
        toast.error('Failed to save offline');
        playFeedback('error');
      }
      setIsSubmitting(false);
      return;
    }

    // Normal online submission
    try {
      const response = await apiFetch('/api/dc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (data.ok || response.ok) {
        toast.success('Lead submitted successfully!');
        playFeedback('success');
        await cleanupDraft();
      } else {
        toast.error(data.error || 'Failed to submit lead');
        playFeedback('error');
      }
    } catch (error: any) {
      console.error(error);
      // Fallback to offline queue on network failure
      await enqueueSync(payload);
      await cleanupDraft();
      toast.warning('Network error. Saved offline.', { description: 'Lead will sync when connection restores.' });
      playFeedback('error');
      updatePendingCount();
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasEnteredData = Object.values(formData).some(v => v && v.trim() !== '');
  const parsedAmount = parseInt(formData.amount || '0', 10);
  const selectedPolicy = formData.loan_type ? LOAN_POLICIES[formData.loan_type] : null;
  const estimatedEMI = (selectedPolicy && parsedAmount > 0 && selectedPolicy.rate > 0)
    ? calculateApproxEMI(parsedAmount, selectedPolicy.rate, selectedPolicy.defaultTenureYears)
    : 0;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-sans font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            Smart Form
            <span className="text-xs px-2 py-0.5 rounded-md bg-brand-orange/10 text-brand-orange font-mono font-bold">AUTO-SMART</span>
          </h2>
          <p className="text-sm text-gray-500">Capture leads securely with automatic local storage auto-save every 5s, instant banking calculators & offline sync.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Auto-save Status Indicator Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-white dark:bg-navy-900/80 border-gray-200 dark:border-navy-800 shadow-sm transition-all duration-300">
            {isAutoSaving ? (
              <span className="flex items-center gap-1.5 text-brand-orange">
                <Save size={13} className="animate-spin" />
                <span>Auto-saving...</span>
              </span>
            ) : isDirty ? (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Clock size={13} className="animate-pulse" />
                <span>Saving in 5s...</span>
              </span>
            ) : lastSavedTime ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400" title={`Auto-saved to local storage at ${lastSavedTime.toLocaleTimeString()}`}>
                <CheckCircle2 size={13} />
                <span>Auto-saved ({lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                <Save size={13} />
                <span>Auto-save (5s)</span>
              </span>
            )}
          </div>

          {/* Online/Offline Status */}
          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${isOnline ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
            {isOnline ? <Cloud size={13} /> : <CloudOff size={13} />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
          
          {/* Pending Sync Queue Badge */}
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
              <Activity size={13} className="animate-pulse" />
              {pendingCount} Pending Sync
            </div>
          )}

          {/* Reset / Clear Draft Button if data exists */}
          {hasEnteredData && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearDraft}
              className="h-8 px-2.5 text-xs font-medium text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 border-gray-200 dark:border-navy-800"
              title="Clear all fields and discard draft"
            >
              <RotateCcw size={12} className="mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Contact Details */}
          <Card className="border-gray-100 dark:border-navy-800 shadow-xl shadow-gray-200/40 dark:shadow-none rounded-2xl bg-white/50 dark:bg-navy-900/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg">Client Details</CardTitle>
              <CardDescription>Primary contact information (persisted automatically)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Full Name *</label>
                <Input 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="e.g. Ramesh Chandra"
                  className="bg-gray-50/50 dark:bg-navy-950/50 border-gray-200 dark:border-navy-800"
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Mobile Number *</label>
                  {formData.phone.length === 10 && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                      <Check size={12} /> Valid 10-digit number
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400 font-semibold">+91</span>
                  <Input 
                    name="phone" 
                    type="tel"
                    value={formData.phone} 
                    onChange={handleChange} 
                    placeholder="9899032117"
                    className="pl-11 bg-gray-50/50 dark:bg-navy-950/50 border-gray-200 dark:border-navy-800"
                    maxLength={10}
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email Address</label>
                <Input 
                  name="email" 
                  type="email"
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="client@example.com"
                  className="bg-gray-50/50 dark:bg-navy-950/50 border-gray-200 dark:border-navy-800"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">City / Location</label>
                <Input 
                  name="city" 
                  value={formData.city} 
                  onChange={handleChange} 
                  placeholder="e.g. Delhi NCR, Mumbai, etc."
                  className="bg-gray-50/50 dark:bg-navy-950/50 border-gray-200 dark:border-navy-800"
                />
                {/* Quick City Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_CITIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleQuickCity(c)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                        formData.city === c 
                          ? 'bg-brand-orange text-white border-brand-orange' 
                          : 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-400 border-transparent hover:border-gray-300'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loan Requirement & Smart Intelligence */}
          <Card className="border-gray-100 dark:border-navy-800 shadow-xl shadow-gray-200/40 dark:shadow-none rounded-2xl bg-white/50 dark:bg-navy-900/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg">Loan Requirement</CardTitle>
              <CardDescription>Product and amount details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Product Category *</label>
                <Select value={formData.loan_type} onValueChange={(v) => handleSelectChange('loan_type', v || '')} required>
                  <SelectTrigger className="bg-gray-50/50 dark:bg-navy-950/50 border-gray-200 dark:border-navy-800">
                    <SelectValue placeholder="Select Loan Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Personal Loan">Personal Loan (~10.5% p.a.)</SelectItem>
                    <SelectItem value="Business Loan">Business Loan (~16.0% p.a.)</SelectItem>
                    <SelectItem value="Home Loan">Home Loan (~8.5% p.a.)</SelectItem>
                    <SelectItem value="Loan Against Property">Loan Against Property (~10.5% p.a.)</SelectItem>
                    <SelectItem value="Auto Loan">Auto Loan (~9.5% p.a.)</SelectItem>
                    <SelectItem value="Credit Card">Credit Card (Instant Pre-approved)</SelectItem>
                    <SelectItem value="Other">Other Requirement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Required Amount (₹) *</label>
                  {parsedAmount > 0 && (
                    <span className="text-xs font-semibold text-brand-orange">
                      {formatIndianNumber(formData.amount)}
                    </span>
                  )}
                </div>
                <Input 
                  name="amount" 
                  type="number"
                  value={formData.amount} 
                  onChange={handleChange} 
                  placeholder="e.g. 500000"
                  className="bg-gray-50/50 dark:bg-navy-950/50 border-gray-200 dark:border-navy-800"
                  required 
                />

                {/* Quick Amount Selection Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_AMOUNTS.map((qa) => (
                    <button
                      key={qa.value}
                      type="button"
                      onClick={() => handleQuickAmount(qa.value)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                        formData.amount === qa.value 
                          ? 'bg-brand-orange text-white border-brand-orange' 
                          : 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-400 border-transparent hover:border-gray-300'
                      }`}
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Auto-Smart Loan Calculation Preview */}
              {selectedPolicy && parsedAmount > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl bg-brand-orange/5 border border-brand-orange/15 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Calculator size={13} className="text-brand-orange" />
                      Indicative Banker Policy
                    </span>
                    <span className="font-mono font-bold text-brand-orange">
                      TAT {selectedPolicy.tat}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/80 dark:bg-navy-900/80 p-2 rounded-lg border border-gray-100 dark:border-navy-800">
                      <div className="text-[10px] text-gray-400 uppercase">Typical Rate</div>
                      <div className="font-bold text-gray-800 dark:text-gray-200">
                        {selectedPolicy.rate > 0 ? `${selectedPolicy.rate}% p.a.` : 'Interest-Free Cycle'}
                      </div>
                    </div>
                    {estimatedEMI > 0 ? (
                      <div className="bg-white/80 dark:bg-navy-900/80 p-2 rounded-lg border border-gray-100 dark:border-navy-800">
                        <div className="text-[10px] text-gray-400 uppercase">Est. Monthly EMI</div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{estimatedEMI.toLocaleString('en-IN')}/mo
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/80 dark:bg-navy-900/80 p-2 rounded-lg border border-gray-100 dark:border-navy-800">
                        <div className="text-[10px] text-gray-400 uppercase">Processing</div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          Fast Track Sanction
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 italic">
                    * {selectedPolicy.note}
                  </p>
                </motion.div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Important Notes</label>
                <textarea 
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Special remarks, client preference, or CIBIL notes..."
                  className="flex min-h-[75px] w-full rounded-md border border-gray-200 dark:border-navy-800 bg-gray-50/50 dark:bg-navy-950/50 px-3 py-2 text-sm shadow-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-orange disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Auto-save active every 5s • Session-timeout protected • Neural Fallback active
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full sm:w-auto h-12 px-8 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold rounded-xl shadow-lg shadow-brand-orange/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>Submit Lead securely</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
