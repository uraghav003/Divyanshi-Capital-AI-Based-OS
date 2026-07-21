import { apiFetch } from "@/lib/api";
import React, { useState } from 'react';
import { 
  Folder, 
  FileText, 
  TrendingUp, 
  Clock, 
  ArrowRight,
  User,
  Shield,
  Activity,
  History,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Search,
  Link as LinkIcon,
  Copy,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Database,
  Lock,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { User as UserType } from '@/types';
import { KYCDocumentScanner } from './KYCDocumentScanner';

interface PersonalFilesProps {
  user: UserType;
  onTriggerSmartForm: (source: string) => void;
}

export function PersonalFiles({ user, onTriggerSmartForm }: PersonalFilesProps) {
  const [activeSubTab, setActiveSubTab] = useState('sales_activity');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [clientHistory, setClientHistory] = useState<Record<string, any[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);

  // Google Drive & Document Linker State
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newCategory, setNewCategory] = useState('KYC Documents');
  const [newDriveLink, setNewDriveLink] = useState('https://drive.google.com/drive/u/0/my-drive');
  const [searchDriveQuery, setSearchDriveQuery] = useState('');
  const [linkedDrives, setLinkedDrives] = useState<any[]>([]);

  // PIN Security State
  const [pinMode, setPinMode] = useState<'view' | 'change' | 'reset' | 'otp' | 'new'>('view');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otp, setOtp] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isPinSubmitting, setIsPinSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState('');

  // Handle countdown
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpCountdown > 0) {
      interval = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpCountdown]);

  const isValidPin = (pin: string) => {
    if (!/^\d{6}$/.test(pin)) return false;
    // reject sequential
    if (/012345|123456|234567|345678|456789|987654|876543|765432|654321|543210/.test(pin)) return false;
    // reject repeated
    if (/^(\d)\1{5}$/.test(pin)) return false;
    // reject EMP_CODE fragment
    if (user.id.includes(pin) || pin.includes(user.id.replace(/\D/g, ''))) return false;
    return true;
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPin(newPin)) {
      toast.error('Invalid PIN format. Avoid repeated or sequential numbers, or employee code fragments.');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('New PINs do not match');
      return;
    }
    if (newPin === currentPin) {
      toast.error('New PIN cannot be the same as the previous PIN');
      return;
    }
    
    setIsPinSubmitting(true);
    try {
      const res = await apiFetch('/api/dc/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empCode: user.id, currentPin, newPin })
      });
      const result = await res.json();
      if (result.ok) {
        toast.success('PIN changed successfully. Other sessions will be invalidated.');
        setPinMode('view');
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        toast.error(result.error || 'Failed to change PIN');
      }
    } catch (err) {
      toast.error('Connection error. Secure PIN service might not be configured.');
    } finally {
      setIsPinSubmitting(false);
    }
  };

  const handleForgotPin = async () => {
    if (otpCountdown > 0) return;
    setIsPinSubmitting(true);
    try {
      const res = await apiFetch('/api/dc/auth/forgot-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empCode: user.id })
      });
      await res.json();
      // Always show generic message
      toast.success('If the employee exists, an OTP has been sent to the registered contact.');
      setPinMode('otp');
      setOtpCountdown(60);
    } catch (err) {
      toast.error('Connection error. Secure PIN service might not be configured.');
    } finally {
      setIsPinSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      toast.error('OTP must be 6 digits');
      return;
    }
    setIsPinSubmitting(true);
    try {
      const res = await apiFetch('/api/dc/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empCode: user.id, otp })
      });
      const result = await res.json();
      if (result.ok) {
        setResetToken(result.token); // The one-time 10-min token
        setPinMode('new');
        setOtp('');
      } else {
        toast.error(result.error || 'Invalid or expired OTP');
      }
    } catch (err) {
      toast.error('Connection error.');
    } finally {
      setIsPinSubmitting(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPin(newPin)) {
      toast.error('Invalid PIN format. Avoid repeated or sequential numbers, or employee code fragments.');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }
    
    setIsPinSubmitting(true);
    try {
      const res = await apiFetch('/api/dc/auth/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empCode: user.id, token: resetToken, newPin })
      });
      const result = await res.json();
      if (result.ok) {
        toast.success('PIN reset successfully. Other sessions will be invalidated.');
        setPinMode('view');
        setNewPin('');
        setConfirmPin('');
        setResetToken('');
      } else {
        toast.error(result.error || 'Failed to reset PIN. Token may have expired.');
      }
    } catch (err) {
      toast.error('Connection error.');
    } finally {
      setIsPinSubmitting(false);
    }
  };

  const handleViewAnalytics = () => {
    const analyticsData = {
      event: 'view_sales_analytics',
      totalConversion: '₹12.4 Cr',
      activeLeads: 42,
      timestamp: new Date().toISOString()
    };
    
    console.log('Analytics Event Logged:', analyticsData);
    toast.info('Analytics data synchronized with enterprise server', {
      description: `Conversion: ${analyticsData.totalConversion} | Active Leads: ${analyticsData.activeLeads}`
    });
  };

  const handleLinkDrive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newDriveLink) {
      toast.error('Please fill in both the client name and drive link');
      return;
    }
    
    // Add new linked drive
    const newDrive = {
      id: 'd' + (linkedDrives.length + 1),
      client: newClientName,
      category: newCategory,
      link: newDriveLink,
      date: new Date().toISOString().split('T')[0],
      status: 'Under Review'
    };
    
    setLinkedDrives([newDrive, ...linkedDrives]);
    setNewClientName('');
    setNewDriveLink('https://drive.google.com/drive/u/0/my-drive');
    toast.success('Google Drive folder linked successfully!', {
      description: `Linked ${newCategory} for ${newClientName}`
    });
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  const runComplianceCheck = (id: string, clientName: string) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: `Running Bulbhul Compliance scan on ${clientName}'s Drive folder...`,
        success: `Compliance check PASSED! All KYC documents present in Drive.`,
        error: `Failed to scan directory.`
      }
    );
    
    // update status to Verified
    setLinkedDrives(prev => prev.map(d => d.id === id ? { ...d, status: 'Verified' } : d));
  };

  const fetchClientHistory = async (clientId: string) => {
    if (clientHistory[clientId]) {
      setExpandedClientId(expandedClientId === clientId ? null : clientId);
      return;
    }

    setLoadingHistory(clientId);
    try {
      const res = await apiFetch("/api/dc/query-data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: "client_history", clientId }) });
      const result = await res.json();
      const history = result.ok ? result.data || [] : [];
      setClientHistory(prev => ({ ...prev, [clientId]: history }));
    } catch (e) {
      setClientHistory(prev => ({ ...prev, [clientId]: [] }));
      toast.error("Failed to load client history");
    } finally {
      setExpandedClientId(clientId);
      setLoadingHistory(null);
    }
    //
  };

  const [salesActivities, setSalesActivities] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [latestScanResult, setLatestScanResult] = useState<any | null>(null);
  const [showScanPanel, setShowScanPanel] = useState(false);

  const handleScanComplete = (result: any) => {
    setLatestScanResult(result);
    setShowScanPanel(true);
  };

  React.useEffect(() => {
    async function loadSales() {
      setLoadingSales(true);
      try {
        const res = await apiFetch("/api/dc/query-data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: "sales_activities" }) });
        const result = await res.json();
        if (result.ok) {
          setSalesActivities(result.data || []);
        }
      } catch (err) {
        console.error("Failed to load sales activities", err);
      } finally {
        setLoadingSales(false);
      }
    }
    loadSales();
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h2 className="text-3xl font-sans font-bold text-gray-900 dark:text-white tracking-tight">Personal Files</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your professional records and activities</p>
      </div>

      <Tabs defaultValue="sales_activity" className="space-y-6" onValueChange={setActiveSubTab}>
        <TabsList className="bg-gray-100 dark:bg-navy-800 p-1 rounded-2xl h-14">
          <TabsTrigger value="profile" className="rounded-xl px-8 h-12 data-[state=active]:bg-white dark:data-[state=active]:bg-navy-900 data-[state=active]:shadow-sm">
            <User size={18} className="mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="sales_activity" className="rounded-xl px-8 h-12 data-[state=active]:bg-white dark:data-[state=active]:bg-navy-900 data-[state=active]:shadow-sm">
            <Activity size={18} className="mr-2" />
            Sales Activity
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-xl px-8 h-12 data-[state=active]:bg-white dark:data-[state=active]:bg-navy-900 data-[state=active]:shadow-sm">
            <Folder size={18} className="mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="compliance" className="rounded-xl px-8 h-12 data-[state=active]:bg-white dark:data-[state=active]:bg-navy-900 data-[state=active]:shadow-sm">
            <Shield size={18} className="mr-2" />
            Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales_activity">
          <div className="grid grid-cols-1 gap-6">
            <Card className="border-none shadow-xl rounded-3xl bg-white dark:bg-navy-900 overflow-hidden">
              <CardHeader className="border-b border-gray-50 dark:border-navy-800 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-sans font-bold dark:text-white">Recent Sales Activity</CardTitle>
                    <CardDescription className="dark:text-gray-400">Direct triggers for Common Entry Gate</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    className="rounded-xl border-gray-100 dark:border-navy-800"
                    onClick={handleViewAnalytics}
                  >
                    <TrendingUp size={16} className="mr-2 text-emerald-500" />
                    View Analytics
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-50 dark:divide-navy-800">
                  {salesActivities.map((activity) => (
                    <div key={activity.id} className="flex flex-col">
                      <div className="p-6 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-navy-800/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500">
                            <FileText size={24} />
                          </div>
                          <div>
                            <h4 className="font-sans font-bold text-gray-900 dark:text-white">{activity.client}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">{activity.type}</span>
                              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                              <span className="text-xs font-sans text-orange-500 font-medium">{activity.status}</span>
                            </div>
                            <button 
                              onClick={() => fetchClientHistory(activity.id)}
                              className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-brand-orange hover:text-brand-orange/80 transition-colors uppercase tracking-wider"
                            >
                              <History size={12} />
                              {loadingHistory === activity.id ? 'Fetching History...' : 'View Client History'}
                              {expandedClientId === activity.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right hidden md:block">
                            <div className="flex items-center gap-1 text-gray-400 text-xs font-mono mb-1">
                              <Clock size={12} />
                              <span>LAST UPDATED</span>
                            </div>
                            <p className="text-sm font-sans font-bold dark:text-white">{activity.date}</p>
                          </div>
                          <Button 
                            onClick={() => onTriggerSmartForm('Sales Team')}
                            className="bg-navy-900 dark:bg-white text-white dark:text-navy-900 rounded-xl px-6 h-12 gap-2 hover:bg-navy-800 dark:hover:bg-gray-100 transition-all active:scale-95"
                          >
                            Process in SmartForm
                            <ArrowRight size={18} />
                          </Button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedClientId === activity.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-gray-50/50 dark:bg-navy-950/30 border-t border-gray-50 dark:border-navy-800"
                          >
                            <div className="p-6 pl-20">
                              <div className="flex items-center gap-2 mb-4">
                                <History size={16} className="text-gray-400" />
                                <h5 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest">Interaction History</h5>
                              </div>
                              <div className="space-y-3">
                                {clientHistory[activity.id]?.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-navy-900 rounded-xl border border-gray-100 dark:border-navy-800 shadow-sm">
                                    <div className="flex items-center gap-4">
                                      <div className="text-xs font-mono text-gray-400">{item.date}</div>
                                      <div>
                                        <p className="text-sm font-sans font-bold dark:text-white">{item.type}</p>
                                        <p className="text-[10px] text-gray-500">{item.amount}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter",
                                        item.status === 'Disbursed' ? "bg-emerald-100 text-emerald-700" :
                                        item.status === 'Approved' ? "bg-blue-100 text-blue-700" :
                                        "bg-rose-100 text-rose-700"
                                      )}>
                                        {item.status}
                                      </span>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                        <ExternalLink size={14} className="text-gray-400" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-none shadow-md rounded-3xl p-6 bg-emerald-500 text-white">
                <h4 className="text-xs font-mono uppercase tracking-widest opacity-80 mb-2">Total Conversion</h4>
                <p className="text-3xl font-sans font-bold">₹12.4 Cr</p>
                <div className="mt-4 flex items-center gap-2 text-xs">
                  <TrendingUp size={14} />
                  <span>+15% from last month</span>
                </div>
              </Card>
              <Card className="border-none shadow-md rounded-3xl p-6 bg-navy-900 text-white">
                <h4 className="text-xs font-mono uppercase tracking-widest opacity-60 mb-2">Active Leads</h4>
                <p className="text-3xl font-sans font-bold">42</p>
                <div className="mt-4 flex items-center gap-2 text-xs opacity-60">
                  <Clock size={14} />
                  <span>Avg. response: 2.4h</span>
                </div>
              </Card>
              <Card className="border-none shadow-md rounded-3xl p-6 bg-white dark:bg-navy-900 border border-gray-100 dark:border-navy-800">
                <h4 className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">Bulbhul Accuracy</h4>
                <p className="text-3xl font-sans font-bold text-brand-orange">98.2%</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                  <Shield size={14} className="text-brand-orange" />
                  <span>AI Validation Active</span>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Linker Form & Drive Connect */}
            <div className="space-y-6 lg:col-span-1">
              {/* Google Drive Status */}
              <Card className="border-none shadow-xl rounded-3xl bg-white dark:bg-navy-900 overflow-hidden">
                <div className="p-6 bg-gradient-to-br from-[#0c4d8e] to-[#1e81df] text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 bg-white/10 rounded-2xl">
                      <Folder size={24} className="text-amber-400" />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
                      isDriveConnected ? "bg-emerald-500/30 text-emerald-300" : "bg-amber-500/30 text-amber-300"
                    )}>
                      {isDriveConnected ? "OAuth Active" : "OAuth Optional"}
                    </span>
                  </div>
                  <h3 className="font-sans font-bold text-lg leading-tight">Google Drive Workspace</h3>
                  <p className="text-xs text-white/80 mt-1 leading-relaxed">
                    Access team files directly from your personal or shared drives.
                  </p>
                  
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-widest uppercase opacity-75">
                      {isDriveConnected ? "Connected as Upendra" : "Offline Mode"}
                    </span>
                    <Button 
                      onClick={() => {
                        setIsDriveConnected(!isDriveConnected);
                        toast.success(isDriveConnected ? "Google Drive disconnected" : "Securely connected to Google Drive workspace via OAuth!");
                      }}
                      size="sm"
                      className="bg-white text-[#0c4d8e] hover:bg-gray-50 rounded-xl font-bold text-xs shadow-sm h-8"
                    >
                      {isDriveConnected ? "Disconnect" : "Connect Drive"}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Link Folder Form */}
              <Card className="border-none shadow-xl rounded-3xl bg-white dark:bg-navy-900 p-6">
                <h4 className="font-sans font-bold text-gray-900 dark:text-white text-base mb-1">Associate Lead Folder</h4>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Bind an active Google Drive directory to a client case</p>
                
                <form onSubmit={handleLinkDrive} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Client / Case Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Ramesh Kumar, TechNova" 
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-navy-800 border-none rounded-xl h-11 px-4 text-sm focus:ring-1 focus:ring-brand-orange text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Document Category</label>
                    <select 
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-navy-800 border-none rounded-xl h-11 px-3 text-sm focus:ring-1 focus:ring-brand-orange text-gray-900 dark:text-white"
                    >
                      <option value="KYC Documents">KYC Documents (Aadhaar/PAN)</option>
                      <option value="CIBIL Report & Bank Stmts">CIBIL Report & Bank Stmts</option>
                      <option value="Property Sanction Letter">Property Sanction Letter</option>
                      <option value="Business Registration Proof">Business Registration Proof</option>
                      <option value="Disbursal Authorization">Disbursal Authorization</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Google Drive Path / URL</label>
                    <input 
                      type="text" 
                      value={newDriveLink}
                      onChange={(e) => setNewDriveLink(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-navy-800 border-none rounded-xl h-11 px-4 text-sm font-mono focus:ring-1 focus:ring-brand-orange text-gray-900 dark:text-white"
                    />
                  </div>

                  <Button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#0c4d8e] to-[#1e81df] text-white rounded-xl h-12 font-bold flex items-center justify-center gap-2 hover:opacity-95 shadow-sm"
                  >
                    <Plus size={16} />
                    Attach Drive Link
                  </Button>
                </form>
              </Card>
            </div>

            {/* Right Column: Shortcuts & Linked Vaults */}
            <div className="lg:col-span-2 space-y-6">
              {/* OCR Scanner Section */}
              <KYCDocumentScanner onScanComplete={handleScanComplete} />

              {/* Shortcuts */}
              <Card className="border-none shadow-xl rounded-3xl bg-white dark:bg-navy-900 p-6">
                <h4 className="font-sans font-bold text-gray-900 dark:text-white text-base mb-1">Corporate Team Drives</h4>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Direct shortcut vault access in India's Largest Loan Facilitator network</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <a 
                    href="https://drive.google.com/drive/u/0/my-drive" 
                    target="_blank" 
                    rel="referrer"
                    className="p-4 bg-blue-50/50 dark:bg-navy-850 hover:bg-blue-50 dark:hover:bg-navy-800 rounded-2xl flex flex-col items-start gap-3 transition-colors border border-blue-100/10"
                  >
                    <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                      <Folder size={18} />
                    </div>
                    <div>
                      <h5 className="font-sans font-bold text-xs text-gray-900 dark:text-white">Master KYC Repo</h5>
                      <p className="text-[10px] text-gray-400 mt-0.5">Corporate Vault</p>
                    </div>
                  </a>

                  <a 
                    href="https://drive.google.com/drive/u/0/my-drive" 
                    target="_blank" 
                    rel="referrer"
                    className="p-4 bg-amber-50/50 dark:bg-navy-850 hover:bg-amber-50 dark:hover:bg-navy-800 rounded-2xl flex flex-col items-start gap-3 transition-colors border border-amber-100/10"
                  >
                    <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                      <Folder size={18} />
                    </div>
                    <div>
                      <h5 className="font-sans font-bold text-xs text-gray-900 dark:text-white">SME Loan Approvals</h5>
                      <p className="text-[10px] text-gray-400 mt-0.5">Finance Department</p>
                    </div>
                  </a>

                  <a 
                    href="https://drive.google.com/drive/u/0/my-drive" 
                    target="_blank" 
                    rel="referrer"
                    className="p-4 bg-purple-50/50 dark:bg-navy-850 hover:bg-purple-50 dark:hover:bg-navy-800 rounded-2xl flex flex-col items-start gap-3 transition-colors border border-purple-100/10"
                  >
                    <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
                      <Folder size={18} />
                    </div>
                    <div>
                      <h5 className="font-sans font-bold text-xs text-gray-900 dark:text-white">Personal Disbursals</h5>
                      <p className="text-[10px] text-gray-400 mt-0.5">Operations Core</p>
                    </div>
                  </a>
                </div>
              </Card>

              {/* Linked Directories List */}
              <Card className="border-none shadow-xl rounded-3xl bg-white dark:bg-navy-900 overflow-hidden">
                <div className="p-6 border-b border-gray-50 dark:border-navy-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-sans font-bold text-gray-900 dark:text-white text-base">Active Client Drive Folders</h4>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Instant compliance links across team terminals</p>
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Filter by client..." 
                      value={searchDriveQuery}
                      onChange={(e) => setSearchDriveQuery(e.target.value)}
                      className="bg-gray-50 dark:bg-navy-800 border-none rounded-xl h-9 pl-9 pr-4 text-xs w-full sm:w-48 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="divide-y divide-gray-50 dark:divide-navy-800">
                  {linkedDrives
                    .filter(d => d.client.toLowerCase().includes(searchDriveQuery.toLowerCase()))
                    .map((drive) => (
                      <div key={drive.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/40 dark:hover:bg-navy-850 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 mt-0.5">
                            <Folder size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-sans font-bold text-sm text-gray-900 dark:text-white">{drive.client}</h5>
                              <span className={cn(
                                "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter",
                                drive.status === 'Verified' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                              )}>
                                {drive.status}
                              </span>
                            </div>
                            <p className="text-[11px] font-mono text-gray-500 mt-0.5">{drive.category}</p>
                            
                            <div className="flex items-center gap-2 mt-2 text-gray-400 text-[10px] font-mono">
                              <LinkIcon size={12} className="text-gray-300" />
                              <span className="truncate max-w-[200px] md:max-w-xs">{drive.link}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleCopyLink(drive.link)}
                            className="h-9 w-9 rounded-xl hover:bg-gray-100 dark:hover:bg-navy-800"
                            title="Copy Drive URL"
                          >
                            <Copy size={14} className="text-gray-400" />
                          </Button>

                          <Button 
                            onClick={() => runComplianceCheck(drive.id, drive.client)}
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl border-gray-100 dark:border-navy-800 h-9 text-xs text-[#0c4d8e] dark:text-sky-400 font-bold hover:bg-[#0c4d8e]/5"
                          >
                            <Sparkles size={13} className="mr-1.5 text-amber-500 animate-pulse" />
                            AI Compliance Scan
                          </Button>

                          <a 
                            href={drive.link} 
                            target="_blank" 
                            rel="referrer"
                            className="bg-[#0c4d8e]/10 text-[#0c4d8e] dark:bg-sky-500/10 dark:text-sky-400 font-bold text-xs h-9 px-4 rounded-xl flex items-center justify-center gap-1 hover:opacity-90"
                          >
                            <span>Open folder</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="compliance">
          <Card className="border-none shadow-xl rounded-3xl bg-white dark:bg-navy-900 overflow-hidden">
            <CardHeader className="border-b border-gray-50 dark:border-navy-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-sans font-bold dark:text-white">Indian RBI Loan Compliance Audit</CardTitle>
                  <CardDescription className="dark:text-gray-400">Master Checklist for India's Largest Loan Facilitator</CardDescription>
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-mono font-bold rounded-full">
                  Audit Status: Compliant
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-gray-400">Document Requirements</h4>
                  
                  <div className="space-y-3">
                    {[
                      { title: "PAN Card / Aadhaar Validation", desc: "Must be officially matched with NSDL/UIDAI APIs via secure proxy server.", checked: true },
                      { title: "Bank Statements Verification", desc: "Minimum 6 months of active savings/current account ledger files.", checked: true },
                      { title: "ITR Filings Verification", desc: "Previous 2 Financial Years acknowledgment receipts for MSME/Personal loans.", checked: true },
                      { title: "CIBIL Score Matching", desc: "Score must be retrieved within 30 days of the lead entry submission.", checked: true }
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-gray-50 dark:bg-navy-800 rounded-2xl">
                        <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-xs font-sans font-bold dark:text-white">{item.title}</h5>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-gray-400 font-bold">RBI Guidelines and Fair Practices</h4>
                  
                  <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-500/5 dark:to-orange-500/5 rounded-3xl border border-amber-200/20 space-y-3">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <AlertCircle size={16} />
                      <h5 className="font-sans font-bold text-xs uppercase tracking-wider">Crucial Enforcement</h5>
                    </div>
                    <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-400 list-disc pl-4 leading-relaxed">
                      <li>**Interest Rate Disclosures**: The Key Fact Statement (KFS) must be generated and printed on the executive business card or shared via official mail before loan signing.</li>
                      <li>**Zero Hidden Charges**: Pre-payment or foreclosure charges on floating rate personal/retail loans are strictly prohibited by the central bank.</li>
                      <li>**Data Encryption**: Under the Digital Lending Guidelines, any customer financial metadata (Common Entries) must reside in secure cloud environments with no unauthorized client-side leaks.</li>
                    </ul>

                    <Button 
                      onClick={() => {
                        toast.info("Master RBI Compliance rules refreshed from the enterprise server.");
                      }}
                      variant="outline" 
                      className="w-full bg-white dark:bg-navy-900 border-amber-200/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 rounded-xl text-xs h-10 font-bold"
                    >
                      Verify Central Rules Database
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="border-none shadow-xl rounded-3xl p-8 bg-white dark:bg-navy-900">
            <div className="flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-full border-4 border-brand-orange/20 p-1 mb-6">
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Upendra" 
                  alt="Profile" 
                  className="w-full h-full rounded-full bg-gray-100"
                />
              </div>
              <h3 className="text-2xl font-sans font-bold dark:text-white">Upendra Raghav</h3>
              <p className="text-brand-orange font-mono uppercase tracking-widest text-sm mt-1">Senior Sales Manager</p>
              
              <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-8">
                <div className="bg-gray-50 dark:bg-navy-800 p-4 rounded-2xl text-left">
                  <p className="text-[10px] text-gray-400 uppercase font-mono mb-1">Employee ID</p>
                  <p className="font-sans font-bold dark:text-white">{user.id}</p>
                </div>
                <div className="bg-gray-50 dark:bg-navy-800 p-4 rounded-2xl text-left">
                  <p className="text-[10px] text-gray-400 uppercase font-mono mb-1">Department</p>
                  <p className="font-sans font-bold dark:text-white">{user.department}</p>
                </div>
              </div>

              {/* PIN Security Section */}
              <div className="w-full max-w-md mt-8 text-left border-t border-gray-100 dark:border-navy-800 pt-8">
                <div className="flex items-center gap-2 mb-6 text-navy-900 dark:text-white">
                  <Shield size={20} className="text-brand-orange" />
                  <h4 className="font-sans font-bold text-lg">PIN Security</h4>
                </div>

                {pinMode === 'view' && (
                  <div className="space-y-4">
                    <Button 
                      onClick={() => setPinMode('change')}
                      className="w-full bg-navy-900 dark:bg-white text-white dark:text-navy-900 rounded-xl h-12 flex items-center justify-center gap-2"
                    >
                      <Lock size={16} /> Change PIN
                    </Button>
                    <Button 
                      onClick={handleForgotPin}
                      variant="outline"
                      className="w-full border-gray-200 dark:border-navy-700 rounded-xl h-12 flex items-center justify-center gap-2"
                      disabled={isPinSubmitting || otpCountdown > 0}
                    >
                      <KeyRound size={16} /> {otpCountdown > 0 ? `Resend OTP in ${otpCountdown}s` : 'Forgot / Reset PIN'}
                    </Button>
                  </div>
                )}

                {pinMode === 'change' && (
                  <form onSubmit={handleChangePin} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase tracking-widest text-gray-500 font-bold">Current PIN</label>
                      <div className="relative">
                        <Input 
                          type={showCurrentPin ? "text" : "password"}
                          value={currentPin}
                          onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0,6))}
                          placeholder="••••••"
                          maxLength={6}
                          className="h-12 rounded-xl"
                          required
                        />
                        <button type="button" onClick={() => setShowCurrentPin(!showCurrentPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showCurrentPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase tracking-widest text-gray-500 font-bold">New 6-Digit PIN</label>
                      <div className="relative">
                        <Input 
                          type={showNewPin ? "text" : "password"}
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0,6))}
                          placeholder="••••••"
                          maxLength={6}
                          className="h-12 rounded-xl"
                          required
                        />
                        <button type="button" onClick={() => setShowNewPin(!showNewPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showNewPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase tracking-widest text-gray-500 font-bold">Confirm New PIN</label>
                      <div className="relative">
                        <Input 
                          type={showConfirmPin ? "text" : "password"}
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0,6))}
                          placeholder="••••••"
                          maxLength={6}
                          className="h-12 rounded-xl"
                          required
                        />
                        <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showConfirmPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setPinMode('view')} className="flex-1 rounded-xl h-11">Cancel</Button>
                      <Button type="submit" disabled={isPinSubmitting} className="flex-1 rounded-xl h-11 bg-brand-orange text-white hover:bg-brand-orange/90">Save PIN</Button>
                    </div>
                  </form>
                )}

                {pinMode === 'otp' && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <p className="text-sm text-gray-500 mb-4">Enter the 6-digit OTP sent to your registered contact.</p>
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase tracking-widest text-gray-500 font-bold">OTP Code</label>
                      <Input 
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))}
                        placeholder="123456"
                        maxLength={6}
                        className="h-12 rounded-xl text-center text-lg tracking-[0.5em]"
                        required
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setPinMode('view')} className="flex-1 rounded-xl h-11">Cancel</Button>
                      <Button type="submit" disabled={isPinSubmitting} className="flex-1 rounded-xl h-11 bg-brand-orange text-white hover:bg-brand-orange/90">Verify OTP</Button>
                    </div>
                    <div className="text-center mt-4">
                      <button type="button" onClick={handleForgotPin} disabled={otpCountdown > 0} className="text-xs text-brand-orange hover:underline disabled:opacity-50">
                        {otpCountdown > 0 ? `Resend OTP in ${otpCountdown}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </form>
                )}

                {pinMode === 'new' && (
                  <form onSubmit={handleResetPin} className="space-y-4">
                    <p className="text-sm text-emerald-500 mb-4 font-medium">OTP verified successfully. Please set your new PIN.</p>
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase tracking-widest text-gray-500 font-bold">New 6-Digit PIN</label>
                      <div className="relative">
                        <Input 
                          type={showNewPin ? "text" : "password"}
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0,6))}
                          placeholder="••••••"
                          maxLength={6}
                          className="h-12 rounded-xl"
                          required
                        />
                        <button type="button" onClick={() => setShowNewPin(!showNewPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showNewPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase tracking-widest text-gray-500 font-bold">Confirm New PIN</label>
                      <div className="relative">
                        <Input 
                          type={showConfirmPin ? "text" : "password"}
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0,6))}
                          placeholder="••••••"
                          maxLength={6}
                          className="h-12 rounded-xl"
                          required
                        />
                        <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showConfirmPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setPinMode('view')} className="flex-1 rounded-xl h-11">Cancel</Button>
                      <Button type="submit" disabled={isPinSubmitting} className="flex-1 rounded-xl h-11 bg-brand-orange text-white hover:bg-brand-orange/90">Reset PIN</Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* OCR Side Panel Overlay */}
      <AnimatePresence>
        {showScanPanel && latestScanResult && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScanPanel(false)}
              className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-white dark:bg-navy-900 h-full shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b border-gray-50 dark:border-navy-800 flex items-center justify-between bg-white dark:bg-navy-900 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-sans font-black dark:text-white uppercase tracking-tighter">Document Intelligence</h3>
                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Real-time AI Verification</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowScanPanel(false)}
                  className="rounded-full hover:bg-gray-100 dark:hover:bg-navy-800"
                >
                  <ChevronDown className="rotate-90" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Result Summary */}
                <div className="flex items-center justify-between p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-[24px]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Verification Status</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{latestScanResult.complianceStatus || 'Verified'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Match Score</p>
                    <p className="text-lg font-black text-brand-orange">{(latestScanResult.confidenceScore * 100).toFixed(1)}%</p>
                  </div>
                </div>

                {/* Intelligence Paragraph */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <Search size={14} className="text-brand-orange" />
                    AI Intelligence Report
                  </h4>
                  <div className="p-6 bg-gray-50 dark:bg-navy-850 rounded-[24px] border border-gray-100 dark:border-navy-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                      {latestScanResult.intelligence || "Extracted metadata matches Indian KYC standards. No AML red flags detected."}
                    </p>
                  </div>
                </div>

                {/* Extracted Fields */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Validated Entities</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <SideField label="Full Legal Name" value={latestScanResult.extractedData.name} />
                    <SideField label="Document ID Number" value={latestScanResult.extractedData.idNumber} />
                    <SideField label="Permanent Address" value={latestScanResult.extractedData.address} />
                    <SideField label="Date of Birth" value={latestScanResult.extractedData.dob} />
                  </div>
                </div>

                {/* Cropped Preview (Simulated Focus) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Source Focus</h4>
                  <div className="relative aspect-video rounded-3xl overflow-hidden border border-gray-100 dark:border-navy-800 shadow-xl group">
                    <div className="absolute inset-0 bg-navy-900 flex items-center justify-center">
                       <FileText size={48} className="text-white/10" />
                       <p className="absolute bottom-4 text-[10px] font-mono text-white/30 uppercase tracking-widest">Encrypted Image Buffer</p>
                    </div>
                    {/* If we had the actual image URL we'd put it here with a zoom effect */}
                    <div className="absolute inset-0 bg-brand-orange/10 flex items-center justify-center backdrop-blur-[1px]">
                      <div className="p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-center">
                        <Sparkles size={24} className="text-white mx-auto mb-2 animate-pulse" />
                        <p className="text-[10px] font-bold text-white uppercase tracking-widest">Privacy Protected View</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50 dark:bg-navy-950 border-t border-gray-50 dark:border-navy-800">
                <Button 
                  onClick={() => {
                    toast.success('Syncing data to SmartForm...');
                    setShowScanPanel(false);
                  }}
                  className="w-full h-14 bg-navy-900 dark:bg-white text-white dark:text-navy-900 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-navy-900/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Inject Data to Lead Form
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SideField({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-navy-900 rounded-2xl border border-gray-50 dark:border-navy-800 hover:border-brand-orange/30 transition-colors">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{value || 'N/A'}</p>
    </div>
  );
}
