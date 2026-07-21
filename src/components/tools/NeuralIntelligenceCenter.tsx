import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Github, 
  ExternalLink, 
  RefreshCw,
  Zap,
  Activity,
  Lock,
  Bug,
  Code2,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LearningData {
  lastLearned: string;
  insights: string[];
  autoImplementable: boolean;
  repoSource: string;
}

interface AuditData {
  auditId: string;
  status: 'SECURE' | 'ALERT';
  timestamp: string;
  threatLevel: number;
  protections: string[];
  details: string;
}

interface AutomationProposal {
  name: string;
  description: string;
  impact: string;
  logic: string;
}

export function NeuralIntelligenceCenter() {
  const [learning, setLearning] = useState<LearningData | null>(null);
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [automations, setAutomations] = useState<AutomationProposal[]>([]);
  const [isLearning, setIsLearning] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isLoadingAutomations, setIsLoadingAutomations] = useState(false);
  const [learningProgress, setLearningProgress] = useState(0);

  useEffect(() => {
    runAudit();
    runLearning();
    fetchAutomations();
    
    // Background audit every 3 minutes
    const auditInterval = setInterval(runAudit, 180000);
    // Background learning every 10 minutes
    const learningInterval = setInterval(runLearning, 600000);
    
    return () => {
      clearInterval(auditInterval);
      clearInterval(learningInterval);
    };
  }, []);

  const runAudit = async () => {
    setIsAuditing(true);
    try {
      const response = await apiFetch('/api/dc/security-audit');
      const data = await response.json();
      if (data.ok) {
        setAudit(data);
        if (data.status === 'ALERT') {
          toast.error("Neural Security Alert Neutralized", {
            description: data.details,
            icon: <ShieldAlert className="text-rose-500" />
          });
        }
      }
    } catch (e) {
      console.warn("Security audit failed");
    } finally {
      setIsAuditing(false);
    }
  };

  const runLearning = async () => {
    setIsLearning(true);
    setLearningProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setLearningProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 200);

    try {
      const response = await apiFetch('/api/dc/self-learn');
      const data = await response.json();
      if (data.ok) {
        setLearning(data.learning);
        toast.info("System Self-Learned New Patterns", {
          description: `Optimized: ${data.learning.lastLearned}`,
          icon: <Sparkles className="text-brand-orange" />
        });
        // Refresh automations after learning
        fetchAutomations();
      }
    } catch (e) {
      console.warn("Self-learning failed");
    } finally {
      setIsLearning(false);
      setLearningProgress(100);
      setTimeout(() => setLearningProgress(0), 1000);
    }
  };

  const fetchAutomations = async () => {
    setIsLoadingAutomations(true);
    try {
      const response = await apiFetch('/api/dc/propose-automations');
      const data = await response.json();
      if (data.ok) {
        setAutomations(data.automations);
      }
    } catch (e) {
      console.warn("Automation fetch failed");
    } finally {
      setIsLoadingAutomations(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Neural Security Monitor */}
      <Card className="border-none shadow-2xl bg-white dark:bg-navy-900 rounded-[32px] overflow-hidden border border-gray-100 dark:border-navy-800">
        <div className="p-6 border-b border-gray-50 dark:border-navy-800 bg-gray-50/50 dark:bg-navy-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg",
              audit?.status === 'SECURE' ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-rose-500 text-white shadow-rose-500/20"
            )}>
              {isAuditing ? <RefreshCw className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div>
              <h3 className="font-black font-sans text-gray-900 dark:text-white uppercase tracking-tighter">Neural Security</h3>
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Active Protection Layer</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-navy-950 rounded-full border border-gray-100 dark:border-navy-800">
             <div className={cn("w-1.5 h-1.5 rounded-full", audit?.status === 'SECURE' ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
             <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">{audit?.status || 'SCANNING...'}</span>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-navy-950 rounded-2xl border border-gray-100 dark:border-navy-800">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Threat Level</span>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-gray-900 dark:text-white">{audit?.threatLevel || 0}%</span>
                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-navy-800 rounded-full mb-1.5 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${audit?.threatLevel || 0}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-navy-950 rounded-2xl border border-gray-100 dark:border-navy-800">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Audit ID</span>
              <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">{audit?.auditId || 'PENDING'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Active Protections</span>
            <div className="flex flex-wrap gap-2">
              {audit?.protections.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/10 text-[10px] font-bold">
                  <Lock size={10} />
                  {p}
                </div>
              ))}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/5 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/10 text-[10px] font-bold">
                <Bug size={10} />
                Auto-Bug Neutralizer
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Self-Learning Center */}
      <Card className="border-none shadow-2xl bg-navy-900 text-white rounded-[32px] overflow-hidden">
        <div className="p-6 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-orange rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-orange/20">
              {isLearning ? <RefreshCw className="animate-spin" size={20} /> : <Brain size={20} />}
            </div>
            <div>
              <h3 className="font-black font-sans uppercase tracking-tighter">Self-Learning Core</h3>
              <p className="text-[10px] font-mono text-brand-orange uppercase tracking-widest font-bold">GitHub Pattern ingestion</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={runLearning}
            disabled={isLearning}
            className="h-8 gap-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10"
          >
            <Activity size={14} className={cn(isLearning && "animate-pulse")} />
            Learn Now
          </Button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Ingestion Progress</span>
              <span className="text-[10px] font-mono text-brand-orange">{learningProgress}%</span>
            </div>
            <Progress value={learningProgress} className="h-1 bg-white/10" />
          </div>

          <AnimatePresence mode="wait">
            {learning && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-brand-orange uppercase tracking-widest">Optimized Pathway</span>
                  <h4 className="text-xl font-black tracking-tighter leading-tight">{learning.lastLearned}</h4>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Neural Insights</span>
                  <div className="space-y-2">
                    {learning.insights.map((insight, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-brand-orange/30 transition-colors">
                        <div className="mt-1 w-1.5 h-1.5 bg-brand-orange rounded-full group-hover:scale-150 transition-transform" />
                        <p className="text-xs text-white/70 leading-relaxed">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {learning.repoSource && (
                  <a 
                    href={learning.repoSource} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                        <Github size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Source Repo</span>
                        <span className="text-xs font-bold truncate max-w-[150px]">latest-automation-patterns</span>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-white/20 group-hover:text-white transition-colors" />
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 bg-black/20 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-brand-orange" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Divyanshi Neural Engine v4.0.1-L</span>
          </div>
        </div>
      </Card>

      {/* Proposed Automations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black font-sans uppercase tracking-tighter text-gray-900 dark:text-white">Neural Automation Pipeline</h3>
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Self-Generated Business Logic</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAutomations}
            disabled={isLoadingAutomations}
            className="rounded-xl h-8 border-gray-200 dark:border-navy-800 text-[10px] font-black uppercase tracking-widest gap-2"
          >
            {isLoadingAutomations ? <RefreshCw size={12} className="animate-spin" /> : <Cpu size={12} />}
            Regenerate
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {automations.map((automation, i) => (
              <motion.div
                key={automation.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-none shadow-sm bg-white dark:bg-navy-900 rounded-[24px] p-6 border border-gray-100 dark:border-navy-800 h-full flex flex-col hover:border-brand-orange/20 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange group-hover:scale-110 transition-transform">
                      <Code2 size={20} />
                    </div>
                    <div className="px-2 py-0.5 bg-gray-100 dark:bg-navy-800 rounded-md text-[8px] font-black uppercase tracking-widest text-gray-500">
                      Impact: {automation.impact}
                    </div>
                  </div>
                  
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">{automation.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 flex-1 leading-relaxed">
                    {automation.description}
                  </p>

                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 dark:bg-navy-950 rounded-xl font-mono text-[9px] text-gray-400 border border-gray-100 dark:border-navy-800 overflow-hidden">
                      <code className="block whitespace-pre-wrap">{automation.logic}</code>
                    </div>
                    <Button variant="ghost" className="w-full justify-between h-8 rounded-lg text-[10px] font-black uppercase tracking-widest text-brand-orange hover:bg-brand-orange/5 px-3">
                      Deploy Automation
                      <ArrowRight size={12} />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
