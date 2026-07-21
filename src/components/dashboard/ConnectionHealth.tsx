import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle2, XCircle, Clock, Server, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const ENDPOINTS = [
  { id: 'banks', name: 'Bank Directory API', path: '/api/dc/banks', method: 'GET' },
  { id: 'dashboard', name: 'Dashboard API', path: '/api/dc/dashboard/ping', method: 'GET' },
  { id: 'chat', name: 'Bulbhul Chat API', path: '/api/dc/chat', method: 'POST' },
  { id: 'query', name: 'Big Data API', path: '/api/dc/query-data', method: 'POST' },
  { id: 'auth', name: 'Authentication API', path: '/api/dc/auth/login', method: 'POST' },
  { id: 'iframe', name: 'Iframe Proxy', path: '/api/dc/iframe', method: 'GET' }
];

type Status = 'online' | 'offline' | 'degraded' | 'checking';

export function ConnectionHealth() {
  const [statuses, setStatuses] = useState<Record<string, { status: Status; latency: number; lastChecked: Date }>>({});
  const [isPolling, setIsPolling] = useState(false);

  const checkEndpoint = async (endpoint: typeof ENDPOINTS[0]) => {
    const start = performance.now();
    try {
      const res = await apiFetch(endpoint.path, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.method === 'POST' ? JSON.stringify({}) : undefined
      });
      const end = performance.now();
      const latency = Math.round(end - start);
      
      // If we get a response (even 400 or 500), the server is reachable.
      // 503, 504, 502 indicate gateway/availability issues.
      let status: Status = 'online';
      if ([502, 503, 504].includes(res.status)) {
        status = 'offline';
      } else if (latency > 2000) {
        status = 'degraded';
      }

      setStatuses(prev => ({
        ...prev,
        [endpoint.id]: { status, latency, lastChecked: new Date() }
      }));
    } catch (err) {
      setStatuses(prev => ({
        ...prev,
        [endpoint.id]: { status: 'offline', latency: 0, lastChecked: new Date() }
      }));
    }
  };

  const pollAll = () => {
    ENDPOINTS.forEach(checkEndpoint);
  };

  useEffect(() => {
    if (!isPolling) return;
    
    pollAll();
    const interval = setInterval(pollAll, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [isPolling]);

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'online': return 'text-emerald-500';
      case 'offline': return 'text-red-500';
      case 'degraded': return 'text-orange-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusBg = (status: Status) => {
    switch (status) {
      case 'online': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'offline': return 'bg-red-500/10 border-red-500/20';
      case 'degraded': return 'bg-orange-500/10 border-orange-500/20';
      default: return 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  return (
    <Card className="border-gray-100 dark:border-navy-800 shadow-xl shadow-gray-200/40 dark:shadow-none bg-white dark:bg-navy-900 overflow-hidden">
      <CardHeader className="border-b border-gray-100 dark:border-navy-800 bg-gray-50/50 dark:bg-navy-900/50 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">System Health</CardTitle>
              <p className="text-xs text-gray-500 mt-1">Real-time /api/dc/* endpoint monitoring</p>
            </div>
          </div>
          <button 
            onClick={() => { setIsPolling(!isPolling); if (!isPolling) pollAll(); }}
            className={cn("p-2 rounded-lg transition-colors", isPolling ? "bg-emerald-500/10 text-emerald-500" : "bg-gray-100 text-gray-500")}
            title={isPolling ? "Pause Polling" : "Resume Polling"}
          >
            <RefreshCw className={cn("w-4 h-4", isPolling && "animate-spin")} style={{ animationDuration: '3s' }} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100 dark:divide-navy-800">
          {ENDPOINTS.map((endpoint) => {
            const data = statuses[endpoint.id] || { status: 'checking', latency: 0, lastChecked: new Date() };
            return (
              <div key={endpoint.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-navy-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full", data.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : data.status === 'offline' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : data.status === 'degraded' ? 'bg-orange-500' : 'bg-gray-300 animate-pulse')} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      {endpoint.name}
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-navy-800 text-gray-500">
                        {endpoint.method}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{endpoint.path}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {data.status !== 'checking' && (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-gray-500">
                      <Clock className="w-3 h-3" />
                      {data.latency}ms
                    </div>
                  )}
                  
                  <div className={cn("px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 min-w-[80px] justify-center", getStatusBg(data.status), getStatusColor(data.status))}>
                    {data.status === 'online' && <CheckCircle2 className="w-3 h-3" />}
                    {data.status === 'offline' && <XCircle className="w-3 h-3" />}
                    {data.status === 'degraded' && <Activity className="w-3 h-3" />}
                    {data.status === 'checking' && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span className="capitalize">{data.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
