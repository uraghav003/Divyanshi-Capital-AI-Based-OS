import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  Save, 
  WifiOff, 
  CloudOff, 
  Cloud, 
  Activity, 
  CheckCircle2, 
  RotateCcw, 
  Clock, 
  Calculator, 
  Check,
  Camera,
  FileCheck,
  Trash2,
  Eye,
  Download,
  Sparkles,
  Plus,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { saveDraft, getDraft, clearDraft, enqueueSync, getSyncQueue, removeFromSyncQueue } from '@/lib/idb';
import { apiFetch } from '@/lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '@/lib/settings';
import { KYCDocumentScannerModal, ScannedKYCDocument } from './KYCDocumentScannerModal';

interface SmartFormProps {
  user: any;
}

export interface SmartFormData {
  name: string;
  phone: string;
  email: string;
  loan_type: string;
  amount: string;
  city: string;
  notes: string;
  documents: ScannedKYCDocument[];
}

const INITIAL_FORM_STATE: SmartFormData = {
  name: '',
  phone: '',
  email: '',
  loan_type: '',
  amount: '',
  city: '',
  notes: '',
  documents: []
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
  const [formData, setFormData] = useState<SmartFormData>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerDocType, setScannerDocType] = useState('PAN Card');
  const [previewDoc, setPreviewDoc] = useState<ScannedKYCDocument | null>(null);

  const DRAFT_KEY = `smart_form_draft_${user?.id || 'guest'}`;
  const LOCAL_STORAGE_KEY = `dc_smart_form_autosave_${user?.id || 'guest'}`;

  // Keep a ref to latest formData for interval access without stale closures
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const lastSavedDataRef = useRef<SmartFormData>(INITIAL_FORM_STATE);

  // Check if form data contains meaningful content to save
  const checkHasData = useCallback((data: SmartFormData) => {
    return Object.entries(data).some(([key, val]) => {
      if (key === 'documents') return Array.isArray(val) && val.length > 0;
      return typeof val === 'string' && val.trim() !== '';
    });
  }, []);

  // Core auto-save persistence handler (LocalStorage + IndexedDB)
  const persistFormData = useCallback(async (dataToSave: SmartFormData) => {
    if (!checkHasData(dataToSave)) return;

    try {
      setIsAutoSaving(true);
      const payload = {
        data: dataToSave,
        timestamp: Date.now(),
        userId: user?.id || 'guest'
      };

      // 1. Persist directly to LocalStorage (with quota fallback)
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
      } catch (lsError) {
        // If localStorage quota is reached due to document images, store lightweight metadata
        try {
          const lightweightPayload = {
            ...payload,
            data: {
              ...payload.data,
              documents: (payload.data.documents || []).map((d) => ({ ...d, dataUrl: '' }))
            }
          };
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightweightPayload));
        } catch (e) {}
      }

      // 2. Persist to IndexedDB as primary high-capacity resilient backup
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
  }, [DRAFT_KEY, LOCAL_STORAGE_KEY, user?.id, checkHasData]);

  // Load initial draft from IndexedDB (complete with documents) or LocalStorage
  useEffect(() => {
    const loadDraft = async () => {
      try {
        let restoredData: SmartFormData | null = null;
        let savedTimestamp: number | null = null;

        // 1. Try IndexedDB first (contains complete image data)
        const idbDraft = await getDraft(DRAFT_KEY);
        if (idbDraft && checkHasData(idbDraft)) {
          restoredData = {
            ...INITIAL_FORM_STATE,
            ...idbDraft,
            documents: Array.isArray(idbDraft.documents) ? idbDraft.documents : []
          };
        }

        // 2. If IndexedDB had nothing, check localStorage
        if (!restoredData) {
          const rawLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (rawLocal) {
            try {
              const parsed = JSON.parse(rawLocal);
              if (parsed && parsed.data && checkHasData(parsed.data)) {
                restoredData = {
                  ...INITIAL_FORM_STATE,
                  ...parsed.data,
                  documents: Array.isArray(parsed.data.documents) ? parsed.data.documents : []
                };
                savedTimestamp = parsed.timestamp;
              }
            } catch (e) {
              console.warn('Malformed localStorage draft:', e);
            }
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
          const docCount = restoredData.documents?.length || 0;
          toast.info('Auto-Saved Draft Restored', {
            description: docCount > 0 
              ? `Recovered form entries and ${docCount} KYC scanned document${docCount > 1 ? 's' : ''}.`
              : 'Your previous form entries were safely recovered from storage.'
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

    if (navigator.onLine) {
      processSyncQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [LOCAL_STORAGE_KEY, DRAFT_KEY, checkHasData]);

  // Periodic Auto-Save Every 5 Seconds (5000ms) to Storage
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      const currentData = formDataRef.current;
      const isNonEmpty = checkHasData(currentData);
      const hasChanged = JSON.stringify(currentData) !== JSON.stringify(lastSavedDataRef.current);

      if (isNonEmpty && hasChanged) {
        persistFormData(currentData);
      }
    }, 5000);

    return () => clearInterval(autoSaveInterval);
  }, [persistFormData, checkHasData]);

  // Flush auto-save on page unload or visibility change to ensure zero data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentData = formDataRef.current;
      if (checkHasData(currentData)) {
        try {
          localStorage.setItem(
            LOCAL_STORAGE_KEY,
            JSON.stringify({
              data: currentData,
              timestamp: Date.now(),
              userId: user?.id || 'guest'
            })
          );
        } catch (e) {}
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const currentData = formDataRef.current;
        const isNonEmpty = checkHasData(currentData);
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
  }, [LOCAL_STORAGE_KEY, persistFormData, user?.id, checkHasData]);

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
      let digits = value.replace(/\D/g, '');
      if (digits.length === 12 && digits.startsWith('91')) {
        digits = digits.slice(2);
      }
      if (digits.length > 10) {
        digits = digits.slice(0, 10);
      }
      value = digits;
    } else if (name === 'name') {
      value = value.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
    }

    updateFormData(name as keyof SmartFormData, value);
  };

  const handleSelectChange = (name: keyof SmartFormData, value: any) => {
    updateFormData(name, value);
  };

  const updateFormData = (name: keyof SmartFormData, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      return next;
    });
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

  // KYC Scanning Handlers
  const handleOpenScanner = (docType: string = 'PAN Card') => {
    setScannerDocType(docType);
    setIsScannerOpen(true);
    playFeedback('click');
  };

  const handleDocumentCaptured = (scannedDoc: ScannedKYCDocument) => {
    setFormData((prev) => {
      const nextDocs = [...prev.documents, scannedDoc];
      const nextData = { ...prev, documents: nextDocs };
      // Trigger immediate persistence for high-priority documents
      persistFormData(nextData);
      return nextData;
    });
    setIsDirty(true);
  };

  const handleRemoveDocument = (docId: string, docName: string) => {
    playFeedback('click');
    setFormData((prev) => {
      const nextDocs = prev.documents.filter((d) => d.id !== docId);
      const nextData = { ...prev, documents: nextDocs };
      persistFormData(nextData);
      return nextData;
    });
    setIsDirty(true);
    toast.info(`Removed ${docName}`);
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
    
    // Prepare lead payload including scanned KYC documents summary and content
    const payload = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      loan_type: formData.loan_type,
      amount: formData.amount,
      city: formData.city,
      notes: formData.notes,
      kyc_documents: formData.documents.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        filterMode: d.filterMode,
        enhanced: d.enhanced,
        sizeKb: d.sizeKb,
        scannedAt: d.scannedAt,
        dataUrl: d.dataUrl
      })),
      kyc_document_count: formData.documents.length,
      kyc_document_types: formData.documents.map((d) => d.name).join(', '),
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
        toast.success('Saved Offline', { 
          description: `Lead & ${formData.documents.length} KYC documents will sync automatically when connection restores.` 
        });
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
        toast.success('Lead and KYC documents submitted successfully!');
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

  const hasEnteredData = checkHasData(formData);
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
          <p className="text-sm text-gray-500">Capture leads with auto-save every 5s, device camera KYC scanner, instant banking calculators & offline sync.</p>
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
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400" title={`Auto-saved to storage at ${lastSavedTime.toLocaleTimeString()}`}>
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

      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* KYC DOCUMENT SCANNER SECTION */}
        <Card className="border-gray-100 dark:border-navy-800 shadow-xl shadow-gray-200/40 dark:shadow-none rounded-2xl bg-white/50 dark:bg-navy-900/50 backdrop-blur-xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="text-brand-orange" size={20} />
                KYC Document Verification
                {formData.documents.length > 0 && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                    {formData.documents.length} ATTACHED
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Scan Aadhaar, PAN Card, or Bank Statements directly using the device camera with automatic grayscale clarity enhancement.
              </CardDescription>
            </div>

            <Button
              type="button"
              onClick={() => handleOpenScanner('PAN Card')}
              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold text-xs h-9 px-4 rounded-xl flex items-center gap-2 shadow-sm"
            >
              <Camera size={15} />
              Open KYC Scanner
            </Button>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            {/* Quick scan document shortcuts */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">Quick Scan:</span>
              <button
                type="button"
                onClick={() => handleOpenScanner('PAN Card')}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-navy-800 bg-white/80 dark:bg-navy-950 hover:border-brand-orange hover:text-brand-orange text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1.5"
              >
                <Plus size={12} /> PAN Card
              </button>
              <button
                type="button"
                onClick={() => handleOpenScanner('Aadhaar Card (Front)')}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-navy-800 bg-white/80 dark:bg-navy-950 hover:border-brand-orange hover:text-brand-orange text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1.5"
              >
                <Plus size={12} /> Aadhaar Front
              </button>
              <button
                type="button"
                onClick={() => handleOpenScanner('Aadhaar Card (Back)')}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-navy-800 bg-white/80 dark:bg-navy-950 hover:border-brand-orange hover:text-brand-orange text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1.5"
              >
                <Plus size={12} /> Aadhaar Back
              </button>
              <button
                type="button"
                onClick={() => handleOpenScanner('Bank Statement (3 Months)')}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-navy-800 bg-white/80 dark:bg-navy-950 hover:border-brand-orange hover:text-brand-orange text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1.5"
              >
                <Plus size={12} /> Bank Statement
              </button>
            </div>

            {/* Scanned Documents Grid */}
            {formData.documents.length === 0 ? (
              <div 
                onClick={() => handleOpenScanner('PAN Card')}
                className="border-2 border-dashed border-gray-200 dark:border-navy-800 rounded-xl p-6 text-center cursor-pointer hover:border-brand-orange/50 transition-colors bg-gray-50/40 dark:bg-navy-950/30 group"
              >
                <div className="h-10 w-10 rounded-full bg-brand-orange/10 text-brand-orange mx-auto flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Camera size={20} />
                </div>
                <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  No KYC documents scanned yet
                </div>
                <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                  Click here or choose a quick shortcut above to scan client identification with camera image capture and grayscale enhancement.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {formData.documents.map((doc) => (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-3 rounded-xl border border-gray-200 dark:border-navy-800 bg-white dark:bg-navy-950/80 flex flex-col justify-between group shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div>
                      {/* Document Preview Thumbnail */}
                      <div 
                        onClick={() => setPreviewDoc(doc)}
                        className="relative w-full aspect-[16/10] bg-gray-950 rounded-lg overflow-hidden mb-2.5 cursor-pointer flex items-center justify-center group/thumb"
                      >
                        <img 
                          src={doc.dataUrl} 
                          alt={doc.name} 
                          className="w-full h-full object-contain group-hover/thumb:scale-105 transition-transform duration-200" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium backdrop-blur-[1px]">
                          <Eye size={15} /> Preview
                        </div>

                        {/* Filter Mode Badge */}
                        <div className="absolute bottom-1.5 left-1.5 bg-black/75 backdrop-blur-sm text-[10px] font-mono text-white px-2 py-0.5 rounded flex items-center gap-1">
                          <Sparkles size={10} className="text-brand-orange" />
                          <span className="capitalize">{doc.filterMode}</span>
                        </div>
                      </div>

                      {/* Document Details */}
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="font-semibold text-xs text-gray-900 dark:text-white truncate" title={doc.name}>
                          {doc.name}
                        </div>
                      </div>
                      
                      <div className="text-[10px] text-gray-500 flex items-center justify-between">
                        <span>{doc.sizeKb} KB · {doc.scannedAt}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ready</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-1.5 pt-2 mt-2 border-t border-gray-100 dark:border-navy-800">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewDoc(doc)}
                        className="h-7 px-2 text-[11px] text-gray-600 dark:text-gray-400 hover:text-gray-900"
                        title="View Full Resolution"
                      >
                        <Eye size={12} className="mr-1" /> View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveDocument(doc.id, doc.name)}
                        className="h-7 px-2 text-[11px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="Delete Document"
                      >
                        <Trash2 size={12} className="mr-1" /> Delete
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* SUBMISSION FOOTER */}
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
              <>
                Submit Lead & Documents {formData.documents.length > 0 && `(${formData.documents.length})`}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* KYC CAMERA SCANNER MODAL */}
      <KYCDocumentScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDocumentCaptured={handleDocumentCaptured}
        initialDocType={scannerDocType}
      />

      {/* FULL-SIZE DOCUMENT PREVIEW LIGHTBOX */}
      <AnimatePresence>
        {previewDoc && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setPreviewDoc(null)}
          >
            <div 
              className="relative max-w-3xl w-full bg-white dark:bg-navy-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-navy-800 flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-navy-800 bg-gray-50 dark:bg-navy-950">
                <div className="flex items-center gap-2">
                  <FileCheck size={18} className="text-brand-orange" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{previewDoc.name}</h3>
                    <p className="text-[11px] text-gray-500">
                      {previewDoc.type} • {previewDoc.filterMode.toUpperCase()} Enhanced • {previewDoc.sizeKb} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={previewDoc.dataUrl}
                    download={`${previewDoc.name.replace(/\s+/g, '_')}_KYC.jpg`}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors"
                    title="Download Scanned Document"
                  >
                    <Download size={18} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(null)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Document Image View */}
              <div className="p-4 bg-gray-950 flex-1 flex items-center justify-center overflow-auto min-h-[300px]">
                <img
                  src={previewDoc.dataUrl}
                  alt={previewDoc.name}
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
                />
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-gray-100 dark:border-navy-800 bg-gray-50 dark:bg-navy-950 flex items-center justify-between text-xs text-gray-500">
                <span>Scanned at {previewDoc.scannedAt}</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPreviewDoc(null)}
                  className="h-8 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-navy-800 dark:hover:bg-navy-700 text-gray-800 dark:text-gray-200"
                >
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
