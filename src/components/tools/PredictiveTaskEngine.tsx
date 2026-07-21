import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Brain, ArrowRight, CheckCircle2, Clock, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Prediction {
  suggestion: string;
  description: string;
  confidence: number;
  urgency: 'high' | 'medium' | 'low';
}

interface PredictiveTaskEngineProps {
  activities: any[];
}

export function PredictiveTaskEngine({ activities }: PredictiveTaskEngineProps) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activities.length > 0) {
      handlePredict();
    }
  }, [activities]);

  const handlePredict = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch("/api/dc/predict-next-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activities: activities.slice(0, 5) }) // Analyze last 5 activities
      });
      const data = await response.json();
      if (data.ok) {
        setPrediction(data.prediction);
      }
    } catch (error) {
      console.error("Prediction Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    toast.success("Neural Suggestion Accepted", {
      description: `"${prediction?.suggestion}" has been added to your task priority queue.`,
      icon: <CheckCircle2 className="text-emerald-500" />
    });
    setPrediction(null);
  };

  if (!prediction && !isLoading) return null;

  return (
    <Card className="border-none shadow-2xl bg-white dark:bg-navy-900 overflow-hidden rounded-[32px] border border-gray-100 dark:border-navy-800">
      <div className="p-6 bg-brand-orange/5 dark:bg-brand-orange/10 border-b border-brand-orange/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-orange rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-orange/20">
            <Brain size={20} />
          </div>
          <div>
            <h3 className="font-black font-sans text-gray-900 dark:text-white uppercase tracking-tighter">Predictive Engine</h3>
            <p className="text-[10px] font-mono text-brand-orange uppercase tracking-widest font-bold">Neural Activity Analysis</p>
          </div>
        </div>
        {prediction && (
          <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-navy-950 rounded-full border border-brand-orange/20">
            <Zap size={12} className="text-brand-orange animate-pulse" />
            <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">
              {Math.round(prediction.confidence * 100)}% Confidence
            </span>
          </div>
        )}
      </div>

      <div className="p-8">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 space-y-4"
            >
              <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-[0.2em] animate-pulse">Analyzing Workflow Patterns...</p>
            </motion.div>
          ) : prediction && (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.2em]",
                    prediction.urgency === 'high' ? "bg-rose-500 text-white" : 
                    prediction.urgency === 'medium' ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                  )}>
                    {prediction.urgency} Urgency
                  </span>
                </div>
                <h4 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-tight">
                  {prediction.suggestion}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-sans leading-relaxed">
                  {prediction.description}
                </p>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={handleAccept}
                  className="flex-1 rounded-2xl h-14 bg-navy-900 dark:bg-white text-white dark:text-navy-900 font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-transform"
                >
                  Confirm & Execute
                  <ArrowRight size={18} className="ml-2" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setPrediction(null)}
                  className="rounded-2xl h-14 px-6 border-2 font-black text-[10px] uppercase tracking-[0.2em]"
                >
                  Dismiss
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-navy-950/50 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <Sparkles size={12} className="text-brand-orange" />
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Driven by Gemini 1.5 Flash</span>
        </div>
      </div>
    </Card>
  );
}
