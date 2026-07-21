import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Activity, Mail, PhoneCall, UserPlus, CheckCircle2, Sparkles, MessageSquare, Tag, Zap, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

export const mockActivities = [
  {
    id: 1,
    type: 'lead',
    title: 'New Lead Assigned',
    description: 'Rajesh Kumar (Personal Loan - ₹5L)',
    time: '2 mins ago',
    icon: UserPlus,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    isAi: false
  },
  {
    id: 2,
    type: 'call',
    title: 'Call Summary Generated',
    description: 'Client is interested in Home Loan. Next follow-up scheduled for Tuesday.',
    time: '15 mins ago',
    icon: PhoneCall,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    isAi: true
  },
  {
    id: 3,
    type: 'email',
    title: 'Client Responded',
    description: 'Re: Document verification for Business Loan.',
    time: '1 hour ago',
    icon: Mail,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    isAi: false
  },
  {
    id: 4,
    type: 'system',
    title: 'Loan Disbursed',
    description: 'Case #4592 has been successfully completed.',
    time: '2 hours ago',
    icon: CheckCircle2,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    isAi: false
  },
  {
    id: 5,
    type: 'ai',
    title: 'Bulbhul Insight',
    description: 'Sentiment analysis indicates high intent from top 3 leads today.',
    time: '3 hours ago',
    icon: Sparkles,
    color: 'text-gold-500',
    bgColor: 'bg-gold-500/10',
    isAi: true
  }
];

interface LeadTag {
  tag: 'HIGH PRIORITY' | 'WARM' | 'COLD';
  reason: string;
}

export function ActivityFeed() {
  const [leadTags, setLeadTags] = useState<Record<number, LeadTag>>({});
  const [isTagging, setIsTagging] = useState(false);

  useEffect(() => {
    // Neural Lead Tagging "Background Worker"
    const runTaggingEngine = async () => {
      setIsTagging(true);
      const leadActivities = mockActivities.filter(a => a.type === 'lead' || a.type === 'call' || a.type === 'email');
      
      for (const activity of leadActivities) {
        try {
          const response = await apiFetch('/api/dc/tag-leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activities: [activity] })
          });
          const data = await response.json();
          if (data.ok) {
            setLeadTags(prev => ({
              ...prev,
              [activity.id]: data.analysis
            }));
          }
        } catch (e) {
          console.warn("[NEURAL ENGINE] Tagging failed for activity:", activity.id);
        }
      }
      setIsTagging(false);
    };

    // Initial run after a small delay
    const timeout = setTimeout(runTaggingEngine, 2000);
    
    // Periodic run every 5 minutes
    const interval = setInterval(runTaggingEngine, 300000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <Card className="border-none shadow-sm rounded-3xl p-6 bg-white dark:bg-navy-900 h-full flex flex-col">
      <CardHeader className="px-0 pt-0 pb-6 flex-none">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-sans font-bold flex items-center gap-2 dark:text-white">
              <Activity className="text-orange-500" size={20} />
              Live Activity Feed
            </CardTitle>
            <CardDescription className="dark:text-gray-400 mt-1">Real-time updates & AI insights</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {isTagging && (
              <div className="flex items-center gap-2">
                <Zap size={12} className="text-brand-orange animate-pulse" />
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest animate-pulse">Neural Tagging...</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] uppercase tracking-widest font-mono text-emerald-500">Live</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-0 pb-0 flex-1 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-navy-800 before:to-transparent">
          {mockActivities.map((activity, index) => (
            <motion.div 
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-navy-900 bg-white dark:bg-navy-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 relative">
                <div className={cn("w-full h-full rounded-full flex items-center justify-center", activity.bgColor, activity.color)}>
                  <activity.icon size={16} />
                </div>
              </div>
              
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-gray-50 dark:bg-navy-800/50 border border-gray-100 dark:border-navy-800 shadow-sm group-hover:shadow-md transition-shadow relative">
                {activity.isAi && (
                  <div className="absolute -top-2.5 -right-2.5">
                    <div className="bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 border-2 border-white dark:border-navy-900">
                      <Sparkles size={8} /> AI
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-1">
                   <h4 className="font-bold text-sm text-gray-900 dark:text-white">{activity.title}</h4>
                   <time className="text-[10px] font-mono text-gray-400 whitespace-nowrap">{activity.time}</time>
                </div>
                
                <AnimatePresence>
                  {leadTags[activity.id] && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mb-2 flex items-center gap-2"
                    >
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                        leadTags[activity.id].tag === 'HIGH PRIORITY' ? "bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/20" :
                        leadTags[activity.id].tag === 'WARM' ? "bg-amber-500 text-white" :
                        "bg-gray-400 text-white"
                      )}>
                        {leadTags[activity.id].tag === 'HIGH PRIORITY' && <ShieldAlert size={10} />}
                        {leadTags[activity.id].tag}
                      </div>
                      <span className="text-[9px] font-mono text-gray-400 dark:text-gray-500 italic">
                        — {leadTags[activity.id].reason}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {activity.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

