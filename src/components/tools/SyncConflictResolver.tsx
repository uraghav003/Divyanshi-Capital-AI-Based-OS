import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Database, 
  Cloud, 
  HardDrive, 
  ChevronRight, 
  CheckCircle2, 
  Clock,
  Sparkles,
  ArrowRightLeft,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ConflictRecord {
  field: string;
  localValue: string;
  remoteValue: string;
  localTime: string;
  remoteTime: string;
  confidence: number;
}

interface SyncConflictResolverProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (source: 'local' | 'remote' | 'manual') => void;
}

export function SyncConflictResolver({ isOpen, onClose, onResolve }: SyncConflictResolverProps) {
  const [selectedConflicts, setSelectedConflicts] = useState<Record<string, 'local' | 'remote'>>({});
  const [isResolving, setIsResolving] = useState(false);

  const conflicts: ConflictRecord[] = [
    {
      field: "Lead Status",
      localValue: "Follow-up Scheduled",
      remoteValue: "Negotiation",
      localTime: "2024-07-18 14:30",
      remoteTime: "2024-07-18 15:10",
      confidence: 0.92
    },
    {
      field: "Requested Amount",
      localValue: "₹45,00,000",
      remoteValue: "₹50,00,000",
      localTime: "2024-07-18 12:15",
      remoteTime: "2024-07-18 11:45",
      confidence: 0.85
    },
    {
      field: "Risk Score",
      localValue: "B+",
      remoteValue: "A-",
      localTime: "2024-07-18 09:00",
      remoteTime: "2024-07-18 15:45",
      confidence: 0.98
    }
  ];

  const handleResolveAll = (source: 'local' | 'remote') => {
    setIsResolving(true);
    setTimeout(() => {
      onResolve(source);
      toast.success(`System synchronized using ${source === 'local' ? 'Local Workspace' : 'Master Sheet'} as source of truth.`, {
        icon: <Sparkles className="text-brand-orange" />
      });
      setIsResolving(false);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy-900/60 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-3xl bg-white dark:bg-navy-900 rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 dark:border-navy-800"
          >
            {/* Header */}
            <div className="p-8 border-b border-gray-50 dark:border-navy-800 bg-gray-50/50 dark:bg-navy-950/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                    <AlertTriangle size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black font-sans dark:text-white uppercase tracking-tighter">Sync Conflict Detected</h2>
                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Discrepancy found in Master Background Data Connection</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                  <X size={20} />
                </Button>
              </div>
              <div className="mt-6 flex items-center gap-6">
                <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-navy-900 rounded-xl border border-gray-100 dark:border-navy-800 shadow-sm">
                  <HardDrive size={16} className="text-brand-orange" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Local Buffer</span>
                    <span className="text-xs font-bold dark:text-white">Workspace State</span>
                  </div>
                </div>
                <ArrowRightLeft size={20} className="text-gray-300" />
                <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-navy-900 rounded-xl border border-gray-100 dark:border-navy-800 shadow-sm">
                  <Cloud size={16} className="text-blue-500" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Remote State</span>
                    <span className="text-xs font-bold dark:text-white">Master Sheet</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Conflict List */}
            <div className="p-8 max-h-[400px] overflow-y-auto custom-scrollbar space-y-4">
              {conflicts.map((conflict, idx) => (
                <div key={idx} className="group relative">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <ChevronRight size={12} className="text-brand-orange" />
                      {conflict.field}
                    </h4>
                    {conflict.confidence > 0.9 && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full">
                        <Sparkles size={10} className="text-emerald-500" />
                        <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">AI Recommended</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <ConflictCard 
                      type="local" 
                      value={conflict.localValue} 
                      time={conflict.localTime} 
                      isSelected={selectedConflicts[conflict.field] === 'local'}
                      onClick={() => setSelectedConflicts(prev => ({ ...prev, [conflict.field]: 'local' }))}
                      recommendation={conflict.remoteTime < conflict.localTime}
                    />
                    <ConflictCard 
                      type="remote" 
                      value={conflict.remoteValue} 
                      time={conflict.remoteTime} 
                      isSelected={selectedConflicts[conflict.field] === 'remote'}
                      onClick={() => setSelectedConflicts(prev => ({ ...prev, [conflict.field]: 'remote' }))}
                      recommendation={conflict.remoteTime > conflict.localTime}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-8 bg-gray-50 dark:bg-navy-950 border-t border-gray-100 dark:border-navy-800 flex items-center justify-between">
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => handleResolveAll('local')}
                  disabled={isResolving}
                  className="rounded-2xl h-12 px-6 font-black text-[10px] uppercase tracking-[0.2em] border-2"
                >
                  Force Local
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleResolveAll('remote')}
                  disabled={isResolving}
                  className="rounded-2xl h-12 px-6 font-black text-[10px] uppercase tracking-[0.2em] border-2"
                >
                  Force Remote
                </Button>
              </div>
              
              <Button 
                onClick={() => handleResolveAll('remote')}
                disabled={isResolving}
                className="rounded-2xl h-14 px-10 bg-navy-900 dark:bg-white text-white dark:text-navy-900 font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-transform"
              >
                {isResolving ? (
                  <RefreshCw size={20} className="animate-spin mr-2" />
                ) : (
                  <CheckCircle2 size={20} className="mr-2" />
                )}
                Confirm Resolution
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ConflictCard({ type, value, time, isSelected, onClick, recommendation }: { 
  type: 'local' | 'remote', 
  value: string, 
  time: string, 
  isSelected: boolean,
  onClick: () => void,
  recommendation: boolean
}) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden group",
        isSelected 
          ? "bg-brand-orange/5 border-brand-orange shadow-lg" 
          : "bg-white dark:bg-navy-900 border-gray-100 dark:border-navy-800 hover:border-gray-200 dark:hover:border-navy-700",
        recommendation && !isSelected && "border-dashed border-emerald-500/30"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {type === 'local' ? <HardDrive size={14} className="text-gray-400" /> : <Cloud size={14} className="text-gray-400" />}
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{type} State</span>
        </div>
        {isSelected && <CheckCircle2 size={16} className="text-brand-orange" />}
      </div>
      <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">{value}</p>
      <div className="flex items-center gap-1.5 text-gray-400">
        <Clock size={10} />
        <span className="text-[8px] font-mono uppercase">{time}</span>
      </div>
      
      {recommendation && (
        <div className="absolute top-0 right-0 p-1">
          <div className="w-1 h-1 bg-emerald-500 rounded-full" />
        </div>
      )}
    </div>
  );
}

import { RefreshCw } from 'lucide-react';
