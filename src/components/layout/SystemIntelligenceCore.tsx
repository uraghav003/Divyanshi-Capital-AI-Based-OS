import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw, CheckCircle2, ShieldCheck, Zap, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
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
    let healthCheckInterval: NodeJS.Timeout;

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        processElement(target);
      }
    };

    const processElement = (target: HTMLInputElement | HTMLTextAreaElement) => {
      // Safety check: Skip sensitive or special fields
      if (target.type === 'password' || target.type === 'hidden' || target.hasAttribute('data-no-intel')) return;

      let value = target.value;
      const type = target.type;
      const name = (target.name || target.placeholder || '').toLowerCase();
      let corrected = false;

      // Global Auto-correction Logic
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
      } else if ((name.includes('name') || name.includes('city') || name.includes('state')) && value.length === 1) {
        const newValue = value.toUpperCase();
        if (newValue !== value) {
          value = newValue;
          corrected = true;
        }
      }

      // Pattern Intelligence (Company Name auto-complete)
      if (value.toLowerCase() === 'div' || value.toLowerCase() === 'divyanshi') {
         showSuggestion(target as HTMLInputElement, 'Divyanshi Capital', 'company');
      }

      if (corrected) {
         target.value = value;
         const inputEvent = new Event('input', { bubbles: true });
         target.dispatchEvent(inputEvent);
         
         target.classList.add('ring-2', 'ring-emerald-400/50', 'transition-all', 'duration-500');
         setTimeout(() => {
           target.classList.remove('ring-2', 'ring-emerald-400/50');
         }, 1000);
      }

      // Generic field suggestions
      if (value.length > 1 && !suggestions.text) {
        for (const key in AUTO_FILL_SUGGESTIONS) {
          if (name.includes(key) || (key === 'loan_type' && name.includes('loan'))) {
            const match = AUTO_FILL_SUGGESTIONS[key].find(s => 
              s.toLowerCase().startsWith(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
            );
            if (match) {
              showSuggestion(target as HTMLInputElement, match, key);
              break;
            }
          }
        }
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

    // Periodic Background "Self-Heal" Scan
    healthCheckInterval = setInterval(() => {
       const inputs = document.querySelectorAll('input, textarea');
       inputs.forEach(input => {
          const el = input as HTMLInputElement;
          if (el === document.activeElement) return; // Don't heal active element to avoid cursor jumps
          if (el.value && el.value.length > 0) {
             // Silently process to heal any remaining issues
             processElement(el);
          }
       });
    }, 5000);

    const showSuggestion = (target: HTMLInputElement, text: string, type: string) => {
      const rect = target.getBoundingClientRect();
      setSuggestionPos({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX
      });
      setSuggestions({ text, type, target });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && suggestions.text && suggestions.target) {
        e.preventDefault();
        suggestions.target.value = suggestions.text;
        // Trigger a fake input event to ensure React state updates
        const event = new Event('input', { bubbles: true });
        suggestions.target.dispatchEvent(event);
        setSuggestions({ text: '', type: '', target: null });
      } else if (e.key === 'Escape') {
        setSuggestions({ text: '', type: '', target: null });
      }
    };

    document.addEventListener('input', handleInput);
    document.addEventListener('paste', handleInput);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('input', handleInput);
      document.removeEventListener('paste', handleInput);
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
      clearTimeout(clearMsgTimeout);
    };
  }, [suggestions]);

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
      
      {/* Master Data Connection Heartbeat */}
      <div className="fixed bottom-4 right-4 z-[90] flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-navy-900/80 backdrop-blur-md rounded-full border border-gray-100 dark:border-navy-800 shadow-lg pointer-events-none">
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          masterSync.status === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
        )} />
        <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
          {masterSync.status === 'connected' ? 'Master Node Active' : 'Master Node Syncing...'}
        </span>
        {masterSync.lastSync && (
          <div className="w-px h-3 bg-gray-200 dark:bg-navy-800 mx-1" />
        )}
        <span className="text-[9px] font-mono text-gray-400 dark:text-gray-500 uppercase">
          {masterSync.lastSync ? `Sync: ${new Date(masterSync.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
        </span>
      </div>
    </>
  );
}
