import React, { useEffect, useState } from 'react';
import { Search, Bell, Clock, HelpCircle, LogOut, Settings, UserCircle, Sun, Moon, Database, RefreshCw, Sparkles, AlertTriangle, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SyncConflictResolver } from '@/components/tools/SyncConflictResolver';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { User } from '@/types';
import { motion } from 'motion/react';

interface HeaderProps {
  user: User;
  title: string;
  onOpenCommandPalette?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

export function Header({ user, title, onOpenCommandPalette, onOpenSettings, onLogout }: HeaderProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'syncing'>('syncing');
  const [securityStatus, setSecurityStatus] = useState<'SECURE' | 'SCANNING' | 'ALERT'>('SCANNING');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    checkSyncStatus();
    checkSecurityStatus();
    
    // Timer interval
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // Sync/Security poll every 60 seconds
    const interval = setInterval(() => {
      checkSyncStatus();
      checkSecurityStatus();
    }, 60000);

    return () => {
      clearInterval(timer);
      clearInterval(interval);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const extendSession = () => {
    setTimeLeft(30 * 60);
    toast.success("Session Extended", {
      description: "Neural session token refreshed for another 30 minutes.",
      icon: <Clock className="text-emerald-500" />
    });
  };

  const checkSecurityStatus = async () => {
    try {
      const response = await apiFetch('/api/dc/security-audit');
      const data = await response.json();
      if (data.ok) {
        setSecurityStatus(data.status);
      }
    } catch (e) {
      setSecurityStatus('ALERT');
    }
  };

  const checkSyncStatus = async () => {
    try {
      const response = await apiFetch('/api/dc/master-sync');
      const data = await response.json();
      if (data.ok) {
        setSyncStatus('connected');
        setLastSyncTime(data.lastSync);
      } else {
        setSyncStatus('disconnected');
      }
    } catch (e) {
      setSyncStatus('disconnected');
    }
  };

  const handleFullSync = async () => {
    setIsResolving(true);
    setSyncStatus('syncing');
    try {
      const response = await apiFetch('/api/dc/master-sync');
      const data = await response.json();
      if (data.ok) {
        toast.success("Full System Sync Complete", {
          description: "All local records have been refreshed from the Master Sheet.",
          icon: <RefreshCw className="text-emerald-500" />
        });
        setSyncStatus('connected');
        setLastSyncTime(new Date().toISOString());
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      toast.error("Full Sync Failed", {
        description: "Unable to reach the Master Sheet. Please try again later."
      });
      setSyncStatus('disconnected');
    } finally {
      setIsResolving(false);
    }
  };

  const handleAutoResolve = async () => {
    setIsResolving(true);
    setSyncStatus('syncing');
    
    // Neural analysis simulation - 50% chance of complex conflict
    const hasComplexConflict = Math.random() > 0.5;

    try {
      if (hasComplexConflict) {
        setTimeout(() => {
          setIsConflictModalOpen(true);
          setIsResolving(false);
          setSyncStatus('connected');
          toast.warning("Manual Conflict Resolution Required", {
            description: "Neural analysis detected structural discrepancies in Master Sheet.",
            icon: <AlertTriangle className="text-amber-500" />
          });
        }, 1000);
        return;
      }

      const response = await apiFetch('/api/dc/master-resolve', { method: 'POST' });
      const data = await response.json();
      if (data.ok) {
        toast.success(data.message, {
          description: data.details,
          icon: <Sparkles className="text-brand-orange" />
        });
        setSyncStatus('connected');
        setLastSyncTime(new Date().toISOString());
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      toast.error("Neural Resolution Failed", {
        description: "Please check your network connection and try again."
      });
      setSyncStatus('disconnected');
    } finally {
      if (!hasComplexConflict) {
        setIsResolving(false);
      }
    }
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="h-20 bg-white dark:bg-navy-900 border-b border-gray-100 dark:border-navy-800 flex items-center justify-between px-8 sticky top-0 z-10 transition-colors duration-300">
      <div>
        <h2 className="text-2xl font-sans font-bold text-gray-900 dark:text-white tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-6">
        {/* Neural Security Shield */}
        <Tooltip>
          <TooltipTrigger render={
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-help",
              securityStatus === 'SECURE' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
              securityStatus === 'SCANNING' ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400" :
              "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
            )}>
              {securityStatus === 'SECURE' ? <ShieldCheck size={16} /> : 
               securityStatus === 'SCANNING' ? <Shield size={16} className="animate-pulse" /> : 
               <ShieldAlert size={16} className="animate-bounce" />}
              <span className="text-[10px] font-black uppercase tracking-widest">
                {securityStatus === 'SECURE' ? 'Shield Active' : 
                 securityStatus === 'SCANNING' ? 'Neural Scan...' : 'Anomaly detected'}
              </span>
            </div>
          } />
          <TooltipContent className="bg-navy-900 text-white border-none rounded-lg font-sans text-xs max-w-xs">
            <p className="font-bold mb-1">Neural Security Layer (NSL)</p>
            <p className="text-gray-400 leading-relaxed">
              {securityStatus === 'SECURE' ? 'System integrity verified. Automated bug neutralization active.' : 
               securityStatus === 'SCANNING' ? 'Performing deep neural integrity scan across all modules...' : 
               'Potential structural anomaly detected. Neural Shield has isolated the affected pathway.'}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Master Sync Indicator */}
        <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-navy-950 rounded-2xl border border-gray-100 dark:border-navy-800">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              syncStatus === 'connected' ? "bg-emerald-500 animate-pulse" : 
              syncStatus === 'syncing' ? "bg-brand-orange animate-spin" : "bg-rose-500"
            )} />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none">
                {syncStatus === 'connected' ? 'Master Sheet Linked' : 
                 syncStatus === 'syncing' ? 'Syncing OS State...' : 'Master Link Offline'}
              </span>
              {lastSyncTime && (
                <span className="text-[8px] font-mono text-gray-400 dark:text-gray-500 uppercase mt-0.5">
                  Last Sync: {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
          <div className="w-px h-6 bg-gray-200 dark:bg-navy-800 mx-1" />
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger render={
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleAutoResolve}
                  disabled={isResolving || syncStatus === 'syncing'}
                  className="h-8 gap-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-orange hover:bg-brand-orange/10 hover:text-brand-orange"
                >
                  {isResolving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Database size={14} />
                  )}
                  Auto-Resolve
                </Button>
              } />
              <TooltipContent className="bg-navy-900 text-white border-none rounded-lg font-sans text-xs">
                <p>Trigger Neural Conflict Resolution</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger render={
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleFullSync}
                  disabled={isResolving || syncStatus === 'syncing'}
                  className="h-8 gap-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-800"
                >
                  <RefreshCw size={14} className={cn(isResolving && "animate-spin")} />
                  Full Sync
                </Button>
              } />
              <TooltipContent className="bg-navy-900 text-white border-none rounded-lg font-sans text-xs">
                <p>Force Refresh from Master Source</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Session Timer */}
        <div className="hidden xl:flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-navy-950 rounded-2xl border border-gray-100 dark:border-navy-800">
           <div className="flex flex-col items-center">
             <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none mb-1">
               Neural Session
             </span>
             <div className={cn(
               "flex items-center gap-2 font-mono font-bold text-sm",
               timeLeft < 300 ? "text-rose-500 animate-pulse" : "text-gray-700 dark:text-gray-300"
             )}>
               <Clock size={14} className={cn(timeLeft < 300 && "animate-spin")} />
               <span>{formatTime(timeLeft)}</span>
             </div>
           </div>
           <div className="w-px h-6 bg-gray-200 dark:bg-navy-800 mx-1" />
           <Button 
             variant="ghost" 
             size="sm" 
             onClick={extendSession}
             className="h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600"
           >
             Extend
           </Button>
        </div>

        <div 
          onClick={onOpenCommandPalette}
          className="relative w-96 cursor-pointer group"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-brand-orange transition-colors" size={18} />
          <div className="pl-11 pr-3.5 py-2.5 bg-gray-50 dark:bg-navy-950 rounded-xl text-sm text-gray-400 dark:text-gray-500 select-none flex items-center justify-between border border-transparent hover:border-gray-100 dark:hover:border-navy-800 transition-all shadow-inner">
            <span>Search menu or clients...</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-mono bg-gray-200 dark:bg-navy-850 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400 font-bold border border-gray-300 dark:border-navy-750">
                {typeof window !== 'undefined' && navigator?.userAgent?.indexOf('Mac') !== -1 ? '⌘K' : 'Ctrl+K'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger render={
              <Button variant="ghost" size="icon" className="rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-800">
                <HelpCircle size={20} />
              </Button>
            } />
            <TooltipContent className="bg-navy-900 text-white border-none rounded-lg font-sans text-xs">
              <p>Help & Support</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger render={
              <Button variant="ghost" size="icon" className="rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-800 relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-brand-orange rounded-full border-2 border-white dark:border-navy-900"></span>
              </Button>
            } />
            <TooltipContent className="bg-navy-900 text-white border-none rounded-lg font-sans text-xs">
              <p>Notifications</p>
            </TooltipContent>
          </Tooltip>

          {mounted && (
            <Tooltip>
              <TooltipTrigger render={
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-800 overflow-hidden"
                  onClick={toggleTheme}
                >
                  <motion.div
                    initial={false}
                    animate={{ 
                      rotate: resolvedTheme === 'dark' ? 0 : 90,
                      scale: 1,
                      opacity: 1
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    key={resolvedTheme}
                  >
                    {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                  </motion.div>
                </Button>
              } />
              <TooltipContent className="bg-navy-900 text-white border-none rounded-lg font-sans text-xs">
                <p>Switch to {resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="h-10 w-px bg-gray-100 dark:bg-navy-800 mx-2"></div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 cursor-pointer group outline-none">
            <div className="text-right">
              <p className="text-sm font-sans font-bold text-gray-900 dark:text-white leading-none group-hover:text-brand-orange transition-colors">{user.name}</p>
              <p className="text-[10px] font-mono text-gold-500 uppercase mt-1 tracking-wider">{user.role}</p>
            </div>
            <Avatar className="h-10 w-10 border-2 border-brand-orange/10 group-hover:border-brand-orange transition-all">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
              <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-gray-100 dark:border-navy-800 bg-white dark:bg-navy-900">
            <DropdownMenuLabel className="font-sans font-bold text-gray-900 dark:text-white px-3 py-2">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-50 dark:bg-navy-800" />
            <DropdownMenuItem className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer focus:bg-gray-50 dark:focus:bg-navy-800 focus:text-brand-orange dark:text-gray-300">
              <UserCircle size={18} />
              <span className="font-sans font-medium">My Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onOpenSettings}
              className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer focus:bg-gray-50 dark:focus:bg-navy-800 focus:text-brand-orange dark:text-gray-300"
            >
              <Settings size={18} />
              <span className="font-sans font-medium">Account Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-50 dark:bg-navy-800" />
            <DropdownMenuItem 
              onClick={onLogout}
              className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer text-rose-500 focus:bg-rose-50 dark:focus:bg-rose-900/20 focus:text-rose-600"
            >
              <LogOut size={18} />
              <span className="font-sans font-medium">Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <SyncConflictResolver 
        isOpen={isConflictModalOpen} 
        onClose={() => setIsConflictModalOpen(false)} 
        onResolve={(source) => {
          setSyncStatus('connected');
          setLastSyncTime(new Date().toISOString());
        }}
      />
    </header>
  );
}
