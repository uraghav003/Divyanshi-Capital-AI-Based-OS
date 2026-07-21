import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

type ConnectionState = 'connected' | 'disconnected' | 'connecting';

export function SidebarConnectionHealth() {
  const [status, setStatus] = useState<ConnectionState>('connecting');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = async () => {
    setStatus('connecting');
    setTimeout(() => window.dispatchEvent(new CustomEvent('backend-connection', { detail: 'connecting' })), 0);
    
    try {
      // Small timeout to prevent endless hanging if completely offline
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await apiFetch('/api/dc/health', { 
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        setStatus('connected');
        setTimeout(() => window.dispatchEvent(new CustomEvent('backend-connection', { detail: 'connected' })), 0);
      } else {
        setStatus('disconnected');
        setTimeout(() => window.dispatchEvent(new CustomEvent('backend-connection', { detail: 'disconnected' })), 0);
      }
    } catch (error) {
      setStatus('disconnected');
      setTimeout(() => window.dispatchEvent(new CustomEvent('backend-connection', { detail: 'disconnected' })), 0);
    } finally {
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    checkHealth();
    
    // Poll every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white/5 rounded-2xl p-4 mb-4 flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
          status === 'connected' ? "bg-emerald-500/20 text-emerald-400" :
          status === 'disconnected' ? "bg-red-500/20 text-red-400" :
          "bg-blue-500/20 text-blue-400"
        )}>
          {status === 'connected' ? <Wifi size={16} /> : 
           status === 'disconnected' ? <WifiOff size={16} /> : 
           <RefreshCw size={16} className="animate-spin" />}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono mb-0.5">API Status</p>
          <p className={cn(
            "text-xs font-sans font-bold capitalize",
            status === 'connected' ? "text-emerald-400" :
            status === 'disconnected' ? "text-red-400" :
            "text-blue-400"
          )}>
            {status}
          </p>
        </div>
      </div>
      <button 
        onClick={checkHealth}
        disabled={status === 'connecting'}
        className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        title="Check Connection"
      >
        <RefreshCw size={14} className={cn(status === 'connecting' && "animate-spin")} />
      </button>
    </div>
  );
}
