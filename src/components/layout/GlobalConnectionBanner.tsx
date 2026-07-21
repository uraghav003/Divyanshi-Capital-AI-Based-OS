import React, { useState, useEffect } from 'react';
import { RefreshCw, ServerCrash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function GlobalConnectionBanner() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connected');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleStatus = (e: any) => {
      setStatus(e.detail);
      if (e.detail === 'disconnected') {
        setShowBanner(true);
      } else if (e.detail === 'connected') {
        setTimeout(() => setShowBanner(false), 2000);
      }
    };
    
    // Listen for custom event dispatched by SidebarConnectionHealth
    window.addEventListener('backend-connection', handleStatus);
    return () => window.removeEventListener('backend-connection', handleStatus);
  }, []);

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] flex justify-center pt-6 pointer-events-none"
        >
          <div className={`shadow-2xl rounded-full px-6 py-3 flex items-center gap-3 font-semibold text-sm backdrop-blur-md pointer-events-auto transition-colors duration-500
            ${status === 'disconnected' ? 'bg-red-500 text-white border border-red-400' : 
              status === 'connecting' ? 'bg-orange-500 text-white border border-orange-400' : 
              'bg-emerald-500 text-white border border-emerald-400'}`}
          >
            {status === 'disconnected' && (
              <>
                <ServerCrash size={18} className="animate-pulse" />
                Backend Connection Lost - Attempting to reconnect...
              </>
            )}
            {status === 'connecting' && (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Reconnecting to backend server...
              </>
            )}
            {status === 'connected' && (
              <>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Connection Restored successfully!
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
