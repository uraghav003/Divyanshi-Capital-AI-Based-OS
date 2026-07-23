import React, { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MarketingAutomation } from '@/components/tools/MarketingAutomation';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { BulbhulChat } from '@/components/ai/BulbhulChat';
import { BulbhulDebugger } from '@/components/ai/BulbhulDebugger';
import { GenieAlerts } from '@/components/ai/GenieAlerts';
import { Inbox } from '@/components/tools/Inbox';
import { GoogleMeet } from '@/components/tools/GoogleMeet';
import { PersonalFiles } from '@/components/tools/PersonalFiles';
import { TokenBoundErrorBoundary } from '@/components/auth/TokenBoundErrorBoundary';
import { IframeModule } from '@/components/layout/IframeModule';
import { QuickLog } from '@/components/tools/QuickLog';
import { VoiceAssistant } from '@/components/tools/VoiceAssistant';
import { NeuralIntelligenceCenter } from '@/components/tools/NeuralIntelligenceCenter';
import { GitHubIntegration } from '@/components/tools/GitHubIntegration';
import { Login } from '@/components/auth/Login';
import { User } from '@/types';
import { motion } from 'motion/react';
import { MessageCircle, Mail as MailIcon, Globe, Phone, Send } from 'lucide-react';
import { SystemIntelligenceCore } from '@/components/layout/SystemIntelligenceCore';
import { GlobalConnectionBanner } from '@/components/layout/GlobalConnectionBanner';
import { apiFetch } from '@/lib/api';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { EmployeeSyncProvider, SyncManager } from '@/lib/sync';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('dc_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        
        if (!parsed || typeof parsed !== 'object') {
          localStorage.removeItem('dc_session');
    localStorage.removeItem('dc_token');
          return null;
        }

        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem('dc_session');
          return null;
        }
        
        const userData = parsed.user || parsed;
        if (!userData || !userData.id || !userData.name || !userData.email) {
          localStorage.removeItem('dc_session');
          return null;
        }

        return userData;
      }
      return null;
    } catch {
      localStorage.removeItem('dc_session');
      return null;
    }
  });

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('dc_session', JSON.stringify({ user: newUser, expiresAt: Date.now() + 8 * 60 * 60 * 1000 }));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('dc_session');
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [triggerSource, setTriggerSource] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoEmpCode = params.get('ssoEmpCode');
    const ssoToken = params.get('ssoToken');
    
    if (ssoEmpCode && ssoToken && !user) {
      // Very basic SSO handling - assumes backend webhook already validated
      // Or you can make an API call to verify the token here
      apiFetch('/api/dc/auth/webhook-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dcb-secret': ssoToken },
        body: JSON.stringify({ empCode: ssoEmpCode })
      }).then((res: Response) => res.json()).then((result: any) => {
        if (result.ok && result.data && result.data.employee) {
          if (result.token) localStorage.setItem('dc_token', result.token);
          handleLogin(result.data.employee);
          // Remove query params
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const validateSession = () => {
      try {
        const stored = localStorage.getItem('dc_session');
        if (!stored) {
          handleLogout();
          return;
        }
        
        const parsed = JSON.parse(stored);
        if (!parsed || typeof parsed !== 'object' || (parsed.expiresAt && Date.now() > parsed.expiresAt)) {
          handleLogout();
          return;
        }
        
        const userData = parsed.user || parsed;
        if (!userData || !userData.id || !userData.name || !userData.email) {
          handleLogout();
        }
      } catch (e) {
        handleLogout();
      }
    };

    validateSession();
    const interval = setInterval(validateSession, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      // Verifies integrity of ALL_EMPLOYEES and PERSONAL_FILE_ID mappings against backend before dashboard fully loads
      SyncManager.verifyIntegrity(true).catch((err) => {
        console.error('[SyncManager Initial Verification Error]:', err);
      });
    }
  }, [user?.id]);

  const handleTriggerSmartForm = (source: string) => {
    setTriggerSource(source);
    setActiveTab('entry');
  };

  if (!user) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster position="top-right" />
      </>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'inbox':
        return <Inbox user={user} />;
      case 'meet':
        return <GoogleMeet user={user} />;
      case 'personal':
        return (
          <TokenBoundErrorBoundary>
            <PersonalFiles user={user} onTriggerSmartForm={handleTriggerSmartForm} />
          </TokenBoundErrorBoundary>
        );
      case 'entry':
        return <IframeModule page="form" manager_email_id={user.email} />;
      case 'marketing':
        return <MarketingAutomation user={user} />;
      case 'bulbul':
        return <BulbhulChat user={user} />;
      case 'debugger':
        return <BulbhulDebugger />;
      case 'genie':
        return <GenieAlerts />;
      case 'cards':
        return <IframeModule page="card" emp={user.id} />;
      case 'calling':
        return <IframeModule page="calling" emp={user.id} />;
            case 'voice':
        return <VoiceAssistant setActiveTab={setActiveTab} />;
      case 'intelligence':
        return (
          <div className="p-8 max-w-4xl mx-auto">
            <NeuralIntelligenceCenter />
          </div>
        );
      case 'master_control':
        return <IframeModule page="get_master_control" />;
      case 'github':
        return <GitHubIntegration user={user} />;
      default:
        return <Dashboard user={user} />;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Enterprise Dashboard';
      case 'inbox': return 'Enterprise Inbox';
      case 'meet': return 'Google Meet Center';
      case 'personal': return 'Personal Files & Activity';
      case 'entry': return 'Smart Form';
      case 'marketing': return 'AI Marketing & Automation Hub';
      case 'bulbul': return 'Bulbhul AI Advisor';
      case 'debugger': return 'Data Debugger';
      case 'genie': return 'Genie Proactive Alerts';
      case 'cards': return 'Business Cards';
      case 'calling': return 'Calling Module';
      case 'voice': return 'Voice Assistant';
      case 'intelligence': return 'Neural Intelligence & Self-Learning';
      case 'master_control': return 'Master Control';
      case 'github': return 'GitHub Integration & Repository Sync';
      default: return 'Divyanshi Capital';
    }
  };

  return (
    <EmployeeSyncProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <div className="flex h-screen bg-gray-50 dark:bg-navy-950 overflow-hidden relative">
            <SystemIntelligenceCore />
            <GlobalConnectionBanner />
            <Sidebar 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              role={user.role} 
              onLogout={handleLogout} 
            />
            
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header user={user} title={getTitle()} onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />
              
              <main className="flex-1 overflow-y-auto bg-gray-50/50">
                {renderContent()}
              </main>
            </div>

                      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => window.open('https://t.me/divyanshicapital', '_blank')}
                className="w-14 h-14 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40 group relative"
              >
                <Send size={24} className="ml-1" />
                <span className="absolute right-full mr-4 px-3 py-1 bg-navy-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Telegram Support</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => window.location.href = 'tel:+917838074351'}
                className="w-14 h-14 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-rose-500/40 group relative"
              >
                <Phone size={24} />
                <span className="absolute right-full mr-4 px-3 py-1 bg-navy-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Call Support</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => window.open('https://wa.me/917838074351', '_blank')}
                className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 group relative"
              >
                <MessageCircle size={28} />
                <span className="absolute right-full mr-4 px-3 py-1 bg-navy-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">WhatsApp Support</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => window.location.href = 'mailto:upendra.raghav@divyanshicapital.com'}
                className="w-14 h-14 bg-navy-900 text-white rounded-full flex items-center justify-center shadow-2xl shadow-navy-900/40 group relative"
              >
                <MailIcon size={28} />
                <span className="absolute right-full mr-4 px-3 py-1 bg-navy-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Enterprise Mail</span>
              </motion.button>
            </div>
            <Toaster position="top-right" />
            <CommandPalette 
              isOpen={isCommandPaletteOpen} 
              onClose={() => setIsCommandPaletteOpen(false)} 
              setActiveTab={setActiveTab} 
              user={user} 
            />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </EmployeeSyncProvider>
  );
}
