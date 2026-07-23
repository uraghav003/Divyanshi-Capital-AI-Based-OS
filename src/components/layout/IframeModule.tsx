import React, { useState } from 'react';
import { Loader2, ExternalLink, ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IframeModuleProps {
  page: string;
  emp?: string;
  manager_email_id?: string;
}

export function IframeModule({ page, emp, manager_email_id }: IframeModuleProps) {
  const [loading, setLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  // Construct URL query params
  const params = new URLSearchParams();
  params.append('page', page);
  if (emp) params.append('emp', emp);
  if (manager_email_id) params.append('manager_email_id', manager_email_id);

  const proxyUrl = `/api/dc/iframe?${params.toString()}`;

  const handleOpenExternal = () => {
    window.open(proxyUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full h-full relative flex flex-col bg-gray-50 dark:bg-navy-950">
      {/* Top Navigation & Status Bar */}
      <div className="bg-white dark:bg-navy-900 border-b border-gray-100 dark:border-navy-800 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
            Module: {page.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setLoading(true);
              setIframeError(false);
            }}
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <RefreshCw size={13} className="mr-1.5" />
            Reload
          </Button>
          <Button
            onClick={handleOpenExternal}
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs font-medium border-gray-200 dark:border-navy-800 hover:bg-brand-orange/10 hover:text-brand-orange text-gray-700 dark:text-gray-200"
          >
            <ExternalLink size={13} className="mr-1.5" />
            Open in New Tab
          </Button>
        </div>
      </div>

      {/* Main iFrame View */}
      <div className="flex-1 w-full h-full relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-navy-950 z-10 gap-3">
            <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
            <p className="text-xs font-mono text-gray-400">Connecting to Divyanshi Capital Module...</p>
          </div>
        )}

        {iframeError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-navy-950 z-10 p-6 text-center">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl mb-3">
              <ShieldAlert size={28} />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Module Connection Blocked by Browser</h3>
            <p className="text-xs text-gray-400 max-w-md mt-1 mb-4">
              Your browser security or same-origin policy is restricting embedded loading for this external module.
            </p>
            <Button onClick={handleOpenExternal} className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-xs px-5 py-2 rounded-xl">
              <ExternalLink size={14} className="mr-2" />
              Open Module directly in New Tab
            </Button>
          </div>
        ) : (
          <iframe 
            src={proxyUrl}
            className="w-full h-full border-none"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setIframeError(true);
            }}
            allow="microphone; camera; clipboard-write"
          />
        )}
      </div>
    </div>
  );
}
