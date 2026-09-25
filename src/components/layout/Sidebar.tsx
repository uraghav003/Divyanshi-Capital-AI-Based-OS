import React from 'react';
import { 
  Globe,
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  LogOut,
  ChevronRight,
  Crown,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types';
import { DivyanshiLogo } from '@/components/ui/Logo';
import { SidebarConnectionHealth } from './SidebarConnectionHealth';
import { SidebarCommunication } from './SidebarCommunication';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: UserRole;
  onLogout: () => void;
}

export function Sidebar({ activeTab, setActiveTab, role, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'entry', label: 'Smart Form', icon: FileText },
    { id: 'calling', label: 'Calling', icon: Phone },
    { id: 'bulbul', label: 'Bulbhul AI', icon: MessageSquare },
  ];

  if (role === 'MD') {
    menuItems.push({ id: 'master_control', label: 'Master Control', icon: Crown });
  }

  return (
    <div className="w-64 bg-navy-900 text-white h-screen max-h-screen flex flex-col border-r border-navy-800 shrink-0 z-30 select-none">
      <div className="p-5 flex items-center gap-3 shrink-0 border-b border-white/5">
        <DivyanshiLogo className="w-10 h-10" />
        <div>
          <h1 className="font-sans font-bold text-lg leading-tight text-white">Divyanshi</h1>
          <p className="text-[10px] uppercase tracking-widest text-gold-500 font-mono">Capital</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-white/10">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-left",
              activeTab === item.id 
                ? "bg-brand-orange text-navy-900 font-bold shadow-lg shadow-brand-orange/20" 
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            )}
          >
            <item.icon size={18} className={cn(
              "transition-transform duration-200 shrink-0",
              activeTab === item.id ? "scale-110 text-navy-900" : "text-gray-400 group-hover:text-white group-hover:scale-110"
            )} />
            <span className="font-sans font-medium text-xs tracking-wide truncate">{item.label}</span>
            {activeTab === item.id && <ChevronRight size={14} className="ml-auto shrink-0 text-navy-900" />}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-white/5 shrink-0 bg-navy-900 space-y-3">
        <SidebarConnectionHealth />
        <SidebarCommunication />
        <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-mono">Current Role</p>
            <p className="text-xs font-sans font-bold text-brand-orange">{role}</p>
          </div>
          <div className="px-2 py-0.5 rounded bg-gold-500/20 text-gold-400 text-[10px] font-mono font-bold">
            P1 HIGH
          </div>
        </div>
        <div className="px-2 flex items-center gap-2 text-[9px] font-mono text-white/40 uppercase tracking-widest">
          <Globe size={10} />
          <span>divyanshicapital.com</span>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-400 hover:text-red-400 hover:bg-red-400/10 gap-2.5 px-3 py-2 h-9 rounded-xl text-xs font-medium"
          onClick={onLogout}
        >
          <LogOut size={16} />
          <span className="font-sans font-medium">Logout</span>
        </Button>
      </div>
    </div>
  );
}
