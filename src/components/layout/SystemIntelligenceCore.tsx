import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw, CheckCircle2, ShieldCheck, Zap, Info, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SystemHealthDashboard } from './SystemHealthDashboard';

const AUTO_FILL_SUGGESTIONS: Record<string, string[]> = {
  email: ['@gmail.com', '@outlook.com', '@yahoo.com', '@hotmail.com', '@icloud.com'],
  department: ['Sales', 'Marketing', 'IT Support', 'Finance', 'Operations', 'Human Resources'],
  source: ['WhatsApp', 'Instagram', 'LinkedIn', 'Referral', 'Bank Referral'],
  loan_type: ['Personal Loan', 'Home Loan', 'Business Loan', 'Gold Loan', 'LAP'],
  company: ['Divyanshi Capital', 'Divyanshi Capital Team', 'Divyanshi Capital Private Limited'],
};

export function SystemIntelligenceCore() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ text: string, type: string, target: HTMLInputElement | null }>({ text: '', type: '', target: null });
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
  const [masterSync, setMasterSync] = useState<{ status: 'connected' | 'disconnected', lastSync: string | null }>({ status: 'disconnected', lastSync: null });
  const [isHealthOpen, setIsHealthOpen] = useState(false);

  const suggestionsRef = useRef(suggestions);
  suggestionsRef.current = suggestions;

  useEffect(() => {
    const handleOpenHealth = () => setIsHealthOpen(true);
    window.addEventListener('dc-open-system-health', handleOpenHealth);
    // Initial Master Sync check
    const checkMasterSync = async () => {
      try {
        const response = await apiFetch('/api/dc/master-sync');
        const data = await response.json();
        if (data.ok) {
          setMasterSync({ status: 'connected', lastSync: data.lastSync });
          console.log("[AUDIT SYSTEM] Master Background Data Connected:", data.sheetId);
        }
      } catch (e) {
        console.warn("[AUDIT SYSTEM] Master Sync Failed:", e);
      }
    };
    checkMasterSync();

    let timeout: NodeJS.Timeout;
    let clearMsgTimeout: NodeJS.Timeout;

    const showSuggestion = (target: HTMLInputElement, text: string, type: string) => {
      const rect = target.getBoundingClientRect();
      setSuggestionPos({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX
      });
      setSuggestions({ text, type, target });
    };

    const processElement = (target: HTMLInputElement | HTMLTextAreaElement) => {
      if (target.type === 'password' || target.type === 'hidden' || target.hasAttribute('data-no-intel')) return;

      let value = target.value;
      const type = target.type;
      const name = (target.name || target.placeholder || '').toLowerCase();
      let corrected = false;

      // Email formatting & correction
      if (type === 'email') {
        const newValue = value.toLowerCase().replace(/\s/g, '');
        if (newValue !== value) {
          value = newValue;
          corrected = true;
        }
        
        const typoMap: Record<string, string> = {
          'gmal.com': 'gmail.com',
          'gmai.com': 'gmail.com',
          'yaho.com': 'yahoo.com',
          'hotmal.com': 'hotmail.com',
          'gmial.com': 'gmail.com'
        };
        for (const typo in typoMap) {
          if (value.endsWith(typo)) {
            value = value.replace(typo, typoMap[typo]);
            corrected = true;
          }
        }

        if (value.includes('@') && !value.split('@')[1].includes('.')) {
          const prefix = value.split('@')[0];
          const partial = value.split('@')[1];
          const match = AUTO_FILL_SUGGESTIONS.email.find(d => d.startsWith('@' + partial));
          if (match) {
            showSuggestion(target as HTMLInputElement, prefix + match, 'email');
          } else {
             setSuggestions({ text: '', type: '', target: null });
          }
        } else {
          setSuggestions({ text: '', type: '', target: null });
        }
      } else if (type === 'tel') {
        const newValue = value.replace(/[^\d+\s-()]/g, '');
        if (newValue !== value) {
          value = newValue;
          corrected = true;
        }
      }

      if (value.toLowerCase() === 'div' || value.toLowerCase() === 'divyanshi') {
         showSuggestion(target as HTMLInputElement, 'Divyanshi Capital', 'company');
      }

      if (corrected) {
         target.value = value;
         target.classList.add('ring-2', 'ring-emerald-400/50', 'transition-all', 'duration-500');
         setTimeout(() => {
           target.classList.remove('ring-2', 'ring-emerald-400/50');
         }, 1000);
      }

      if (name) {
        localStorage.setItem(`dc_intelligence_sync_${name}`, value);
      }

      setIsSyncing(true);
      setLastAction(corrected ? 'Self-Healing Active (10x)' : 'AI Processing & Syncing...');
      
      clearTimeout(timeout);
      clearTimeout(clearMsgTimeout);
      
      timeout = setTimeout(() => {
        setIsSyncing(false);
        setLastAction(corrected ? 'Core Healed & Synced' : 'Intelligence Synced');
        
        clearMsgTimeout = setTimeout(() => {
          setLastAction(null);
        }, 2000);
      }, 800);
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        processElement(target);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const current = suggestionsRef.current;
      if (e.key === 'Tab' && current.text && current.target) {
        e.preventDefault();
        current.target.value = current.text;
        setSuggestions({ text: '', type: '', target: null });
      } else if (e.key === 'Escape') {
        setSuggestions({ text: '', type: '', target: null });
      }
    };

    document.addEventListener('input', handleInput);
    document.addEventListener('paste', handleInput);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('dc-open-system-health', handleOpenHealth);
      document.removeEventListener('input', handleInput);
      document.removeEventListener('paste', handleInput);
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
      clearTimeout(clearMsgTimeout);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {lastAction && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] flex items-center gap-3 bg-white dark:bg-navy-900 border border-gray-100 dark:border-navy-800 shadow-2xl rounded-full px-5 py-2.5"
          >
            {isSyncing ? (
              <RefreshCw size={16} className="text-blue-500 animate-spin" />
            ) : (
              <ShieldCheck size={16} className="text-emerald-500" />
            )}
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {lastAction}
            </span>
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20 ml-2 shadow-sm">
               <Zap size={12} className="text-emerald-500 fill-emerald-500" />
               <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Self-Heal 10x</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {suggestions.text && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ top: suggestionPos.top, left: suggestionPos.left }}
            className="fixed z-[110] bg-navy-900 text-white px-3 py-2 rounded-xl shadow-2xl border border-white/10 text-xs flex items-center gap-2 pointer-events-none"
          >
            <Sparkles size={12} className="text-gold-500" />
            <span>Press <kbd className="bg-white/20 px-1.5 py-0.5 rounded font-mono text-[10px]">TAB</kbd> to autofill: <span className="font-bold text-gold-500">{suggestions.text}</span></span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Master Data Connection Heartbeat - Interactive trigger for System Health Dashboard */}
      <button
        type="button"
        onClick={() => setIsHealthOpen(true)}
        className="fixed bottom-4 left-72 z-40 hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-white/95 dark:bg-navy-900/95 backdrop-blur-md rounded-full border border-gray-200/80 dark:border-navy-800 shadow-md hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-all duration-200 cursor-pointer group pointer-events-auto select-none"
        title="Open Real-Time System Health & Telemetry Dashboard"
      >
        <div className={cn(
          "w-2 h-2 rounded-full transition-all duration-300",
          masterSync.status === 'connected' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" : "bg-amber-400 animate-ping"
        )} />
        <span className="text-[10px] font-mono font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {masterSync.status === 'connected' ? 'MASTER NODE ACTIVE' : 'MASTER NODE SYNCING...'}
        </span>
        {masterSync.lastSync && (
          <div className="w-px h-3 bg-gray-200 dark:bg-navy-800 mx-0.5" />
        )}
        <span className="text-[9px] font-mono text-gray-400 dark:text-gray-500 uppercase">
          {masterSync.lastSync ? `SYNC: ${new Date(masterSync.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
        </span>
        <div className="w-px h-3 bg-gray-200 dark:bg-navy-800 mx-0.5" />
        <div className="flex items-center gap-1 text-[9px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-500/20 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
          <Activity size={10} className="animate-pulse" />
          <span>HEALTH</span>
        </div>
      </button>

      {/* Real-Time System Health Dashboard */}
      <SystemHealthDashboard
        isOpen={isHealthOpen}
        onClose={() => setIsHealthOpen(false)}
        masterSyncStatus={masterSync.status}
        lastSyncTime={masterSync.lastSync}
      />
    </>
  );
}
