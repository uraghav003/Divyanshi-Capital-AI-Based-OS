import React from 'react';
import { 
  Globe,
  Megaphone,
  Mail,
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Bell, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  FolderOpen,
  Terminal,
  Crown,
  Phone,
  Mic,
  Brain,
  Github,
  Video
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
    { id: 'personal', label: 'Personal Files', icon: FolderOpen },
    { id: 'meet', label: 'Google Meet', icon: Video },
    { id: 'inbox', label: 'Inbox', icon: Mail },
    { id: 'intelligence', label: 'Neural Intel', icon: Brain },
    { id: 'entry', label: 'Smart Form', icon: FileText },
    { id: 'calling', label: 'Calling', icon: Phone },
    { id: 'marketing', label: 'AI Marketing & Auto', icon: Megaphone },
    { id: 'bulbul', label: 'Bulbhul AI', icon: MessageSquare },
    { id: 'debugger', label: 'Data Debugger', icon: Terminal },
    { id: 'genie', label: 'Genie Alerts', icon: Bell },
    { id: 'voice', label: 'Voice Assistant', icon: Mic },
    { id: 'cards', label: 'Business Cards', icon: ShieldCheck },
    { id: 'github', label: 'GitHub Sync', icon: Github },
  ];

  if (role === 'MD') {
    menuItems.splice(8, 0, { id: 'master_control', label: 'Master Control', icon: Crown });
  }

  return (
    <div className="w-64 bg-navy-900 text-white h-screen flex flex-col border-r border-navy-800">
      <div className="p-6 flex items-center gap-3">
        <DivyanshiLogo className="w-12" />
        <div>
          <h1 className="font-sans font-bold text-lg leading-tight">Divyanshi</h1>
          <p className="text-[10px] uppercase tracking-widest text-gold-500 font-mono">Capital</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              activeTab === item.id 
                ? "bg-brand-orange text-navy-900 shadow-lg shadow-brand-orange/20" 
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon size={20} className={cn(
              "transition-transform duration-200",
              activeTab === item.id ? "scale-110" : "group-hover:scale-110"
            )} />
            <span className="font-sans font-medium text-sm">{item.label}</span>
            {activeTab === item.id && <ChevronRight size={16} className="ml-auto" />}
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-white/5">
        <SidebarConnectionHealth />
        <SidebarCommunication />
        <div className="bg-white/5 rounded-2xl p-4 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono mb-1">Current Role</p>
          <p className="text-sm font-sans font-semibold text-brand-orange">{role}</p>
        </div>
        <div className="px-4 mb-4 flex items-center gap-2 text-[10px] font-mono text-white/30 uppercase tracking-widest">
          <Globe size={10} />
          <span>www.divyanshicapital.com</span>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-400 hover:text-red-400 hover:bg-red-400/10 gap-3 px-4 py-6 rounded-xl"
          onClick={onLogout}
        >
          <LogOut size={20} />
          <span className="font-sans font-medium">Logout</span>
        </Button>
      </div>
    </div>
  );
}
