import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  LayoutDashboard, 
  FolderOpen, 
  Mail, 
  Brain, 
  FileText, 
  Phone, 
  Megaphone, 
  MessageSquare, 
  Terminal, 
  Bell, 
  Mic, 
  ShieldCheck, 
  Github, 
  Crown, 
  User, 
  Building, 
  MapPin, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  FileSpreadsheet, 
  Copy, 
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { User as UserType } from '@/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: string) => void;
  user: UserType;
}

interface ClientFile {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  type: string;
  amount: string;
  city: string;
  status: 'In Progress' | 'Disbursed' | 'Approved' | 'Processing';
  underwriter: string;
  underwriterCode: string;
  documents: { name: string; status: 'Verified' | 'Pending' | 'Under Review' }[];
}

export function CommandPalette({ isOpen, onClose, setActiveTab, user }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedClient, setSelectedClient] = useState<ClientFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const clientFiles: ClientFile[] = [
    {
      id: 'c1',
      name: 'TechNova Solutions Pvt Ltd',
      contactPerson: 'Arjun Malhotra',
      phone: '+91 99999 88888',
      type: 'Business Loan',
      amount: '₹5,00,00,000',
      city: 'New Delhi',
      status: 'In Progress',
      underwriter: 'Priya Patel',
      underwriterCode: 'DC004',
      documents: [
        { name: 'KYC Verification', status: 'Verified' },
        { name: 'Income Tax Returns (ITR)', status: 'Verified' },
        { name: 'Bank Account Statements', status: 'Pending' },
        { name: 'Business Registration (GST)', status: 'Verified' }
      ]
    },
    {
      id: 'c2',
      name: 'Karan Sharma',
      phone: '+91 98765 43210',
      type: 'Personal Loan',
      amount: '₹8,50,000',
      city: 'Mumbai',
      status: 'Disbursed',
      underwriter: 'Shubham Sharma',
      underwriterCode: 'DC003',
      documents: [
        { name: 'Aadhaar Card Copy', status: 'Verified' },
        { name: 'PAN Card Copy', status: 'Verified' },
        { name: 'Salary Slip (3 Months)', status: 'Verified' },
        { name: 'Form 16', status: 'Verified' }
      ]
    },
    {
      id: 'c3',
      name: 'Ananya Gupta',
      phone: '+91 98111 22233',
      type: 'Home Loan',
      amount: '₹1,20,00,000',
      city: 'Delhi',
      status: 'Approved',
      underwriter: 'Priya Patel',
      underwriterCode: 'DC004',
      documents: [
        { name: 'Aadhaar Card Copy', status: 'Verified' },
        { name: 'PAN Card Copy', status: 'Verified' },
        { name: 'Bank Statement (6 Months)', status: 'Verified' },
        { name: 'Property Title Deeds', status: 'Under Review' }
      ]
    },
    {
      id: 'c4',
      name: 'Vikas Malhotra',
      phone: '+91 95555 66666',
      type: 'Loan Against Property',
      amount: '₹75,00,000',
      city: 'Gurgaon',
      status: 'Processing',
      underwriter: 'Shubham Sharma',
      underwriterCode: 'DC003',
      documents: [
        { name: 'PAN Card Copy', status: 'Verified' },
        { name: 'ITR V acknowledgment', status: 'Verified' },
        { name: 'Property Registration Document', status: 'Under Review' },
        { name: 'Collateral Valuation Report', status: 'Pending' }
      ]
    },
    {
      id: 'c5',
      name: 'Divya Enterprise',
      contactPerson: 'Divya Jindal',
      phone: '+91 88888 77777',
      type: 'Business Loan',
      amount: '₹45,00,000',
      city: 'Noida',
      status: 'Approved',
      underwriter: 'Priya Patel',
      underwriterCode: 'DC004',
      documents: [
        { name: 'GST Certificate', status: 'Verified' },
        { name: 'ITR-V (Assessment)', status: 'Verified' },
        { name: 'Audit Report (FY 24-25)', status: 'Verified' },
        { name: 'Bank Statement (12 Months)', status: 'Verified' }
      ]
    },
    {
      id: 'c6',
      name: 'Rajesh Patel',
      phone: '+91 91234 56789',
      type: 'Auto Loan',
      amount: '₹18,00,000',
      city: 'Ahmedabad',
      status: 'Disbursed',
      underwriter: 'Shubham Sharma',
      underwriterCode: 'DC003',
      documents: [
        { name: 'PAN Card Copy', status: 'Verified' },
        { name: 'Salary & Income Proof', status: 'Verified' },
        { name: 'Salary Account Statement', status: 'Verified' },
        { name: 'Car Invoice Draft', status: 'Verified' }
      ]
    }
  ];

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', category: 'Navigation', icon: LayoutDashboard, desc: 'Enterprise Analytics, KPIs & Charts' },
    { id: 'personal', label: 'Personal Files', category: 'Navigation', icon: FolderOpen, desc: 'Sales Activity, Drive Links, Sec PIN' },
    { id: 'inbox', label: 'Inbox', category: 'Navigation', icon: Mail, desc: 'Incoming Emails, Enquiries & Leads' },
    { id: 'intelligence', label: 'Neural Intel', category: 'Navigation', icon: Brain, desc: 'Self-Learning OS & Audits' },
    { id: 'entry', label: 'Smart Form', category: 'Navigation', icon: FileText, desc: 'Raw Lead Onboarding Portal' },
    { id: 'calling', label: 'Calling', category: 'Navigation', icon: Phone, desc: 'DC_CALLING_APP Outbound Module' },
    { id: 'marketing', label: 'AI Marketing & Auto', category: 'Navigation', icon: Megaphone, desc: 'External Marketing Campaigns' },
    { id: 'bulbul', label: 'Bulbhul AI Advisor', category: 'Navigation', icon: MessageSquare, desc: 'In-app Conversational Banker Assistant' },
    { id: 'debugger', label: 'Data Debugger', category: 'Navigation', icon: Terminal, desc: 'Diagnostic & Neutralization Logs' },
    { id: 'genie', label: 'Genie Alerts', category: 'Navigation', icon: Bell, desc: 'Real-time Lead Flow Notifications' },
    { id: 'voice', label: 'Voice Assistant', category: 'Navigation', icon: Mic, desc: 'Siri-style Audio Interaction' },
    { id: 'cards', label: 'Business Cards', category: 'Navigation', icon: ShieldCheck, desc: 'Employee Brand ID Cards' },
    { id: 'github', label: 'GitHub Sync', category: 'Navigation', icon: Github, desc: 'Code Repository Management' }
  ];

  if (user.role === 'MD') {
    navigationItems.push({ id: 'master_control', label: 'Master Control', category: 'Navigation', icon: Crown, desc: 'Supreme Administration Settings' });
  }

  // Filter both menus
  const filteredNav = navigationItems.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase()) || 
    item.desc.toLowerCase().includes(query.toLowerCase())
  );

  const filteredClients = clientFiles.filter(client => 
    client.name.toLowerCase().includes(query.toLowerCase()) || 
    client.type.toLowerCase().includes(query.toLowerCase()) || 
    client.phone.includes(query) || 
    (client.contactPerson && client.contactPerson.toLowerCase().includes(query.toLowerCase())) ||
    client.city.toLowerCase().includes(query.toLowerCase())
  );

  const totalFilteredCount = filteredNav.length + filteredClients.length;

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // Handled by parent container but keeping for local safety
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        if (selectedClient) {
          setSelectedClient(null);
        } else {
          onClose();
        }
      }

      if (selectedClient) return; // Freeze palette navigation when viewing details

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalFilteredCount);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalFilteredCount) % totalFilteredCount);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        triggerSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, totalFilteredCount, selectedClient]);

  // Adjust scroll when navigating via keyboard
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Reset indices on query or state changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setSelectedClient(null);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const triggerSelection = () => {
    if (selectedIndex < filteredNav.length) {
      const item = filteredNav[selectedIndex];
      setActiveTab(item.id);
      toast.success(`Switched to ${item.label}`);
      onClose();
    } else {
      const clientIndex = selectedIndex - filteredNav.length;
      const client = filteredClients[clientIndex];
      setSelectedClient(client);
    }
  };

  const handleCopyValue = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard!`);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Disbursed':
        return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20';
      case 'Approved':
        return 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20';
      case 'In Progress':
        return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20';
      default:
        return 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20';
    }
  };

  const getDocStatusIcon = (status: string) => {
    switch (status) {
      case 'Verified':
        return <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />;
      case 'Under Review':
        return <Clock size={16} className="text-blue-500 shrink-0 animate-pulse" />;
      default:
        return <AlertCircle size={16} className="text-amber-500 shrink-0" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-navy-950/60 backdrop-blur-md transition-opacity"
          />

          {/* Palette container */}
          <div className="flex min-h-screen items-start justify-center p-4 sm:p-6 md:p-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className={cn(
                "w-full bg-white dark:bg-navy-900 rounded-3xl border border-gray-100 dark:border-navy-800 shadow-2xl overflow-hidden mt-[10vh] flex flex-col transition-all duration-300",
                selectedClient ? "max-w-3xl" : "max-w-2xl"
              )}
            >
              {/* Header block */}
              <div className="p-5 border-b border-gray-100 dark:border-navy-800 flex items-center gap-4 relative">
                <Search size={22} className="text-gray-400 dark:text-gray-500 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={selectedClient ? "Client inspector mode..." : "Type to search sections or client files..."}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={!!selectedClient}
                  className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none text-base border-none"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-navy-800 px-2 py-1 rounded font-bold uppercase tracking-wider">
                    ESC
                  </span>
                  <button 
                    onClick={selectedClient ? () => setSelectedClient(null) : onClose}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-800 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Dual-pane layouts: Client Details vs Standard searchable list */}
              <div className="flex-1 overflow-y-auto max-h-[500px]">
                <AnimatePresence mode="wait">
                  {selectedClient ? (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-8"
                    >
                      {/* Return breadcrumb */}
                      <button 
                        onClick={() => setSelectedClient(null)}
                        className="text-xs font-bold text-brand-orange hover:text-brand-orange/80 transition-colors mb-4 flex items-center gap-1.5 uppercase tracking-wider"
                      >
                        ← Back to Search Results
                      </button>

                      {/* Header details */}
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-6 border-b border-gray-100 dark:border-navy-800">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-sans font-black text-gray-900 dark:text-white tracking-tight">
                              {selectedClient.name}
                            </h3>
                            <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono", getStatusStyle(selectedClient.status))}>
                              {selectedClient.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                            {selectedClient.contactPerson && (
                              <>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">
                                  {selectedClient.contactPerson}
                                </span>
                                <span className="text-gray-300">|</span>
                              </>
                            )}
                            <span className="font-mono text-xs text-gray-400">{selectedClient.id.toUpperCase()}</span>
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setActiveTab('personal');
                              onClose();
                            }}
                            className="bg-navy-900 dark:bg-white text-white dark:text-navy-900 px-4 py-2 rounded-xl text-xs font-bold font-sans hover:bg-navy-800 dark:hover:bg-gray-100 flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                          >
                            <FolderOpen size={14} />
                            View Folder
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('bulbul');
                              onClose();
                              toast.success(`Loaded client context in Bulbhul Chat!`);
                            }}
                            className="bg-brand-orange text-navy-900 px-4 py-2 rounded-xl text-xs font-bold font-sans hover:bg-brand-orange/90 flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                          >
                            <MessageSquare size={14} />
                            Consult Bulbhul
                          </button>
                        </div>
                      </div>

                      {/* Parameters Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-gray-100 dark:border-navy-800">
                        <div className="space-y-1 bg-gray-50/50 dark:bg-navy-950/20 p-4 rounded-2xl border border-gray-50 dark:border-navy-800">
                          <p className="text-[10px] font-black font-mono text-gray-400 uppercase tracking-widest">PRODUCT & VALUE</p>
                          <p className="text-lg font-sans font-black text-gray-900 dark:text-white">{selectedClient.amount}</p>
                          <p className="text-xs font-sans text-brand-orange font-medium">{selectedClient.type}</p>
                        </div>

                        <div className="space-y-1 bg-gray-50/50 dark:bg-navy-950/20 p-4 rounded-2xl border border-gray-50 dark:border-navy-800">
                          <p className="text-[10px] font-black font-mono text-gray-400 uppercase tracking-widest">CONTACT INFO</p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-sans font-bold text-gray-800 dark:text-gray-200">{selectedClient.phone}</p>
                            <button 
                              onClick={() => handleCopyValue(selectedClient.phone, 'Phone number')}
                              className="text-gray-400 hover:text-brand-orange transition-colors p-1"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                          <p className="text-xs font-sans text-gray-400 flex items-center gap-1">
                            <MapPin size={12} />
                            {selectedClient.city}
                          </p>
                        </div>

                        <div className="space-y-1 bg-gray-50/50 dark:bg-navy-950/20 p-4 rounded-2xl border border-gray-50 dark:border-navy-800">
                          <p className="text-[10px] font-black font-mono text-gray-400 uppercase tracking-widest">ASSIGNED RM</p>
                          <p className="text-sm font-sans font-bold text-gray-800 dark:text-gray-200">{selectedClient.underwriter}</p>
                          <p className="text-xs font-mono text-gold-500">{selectedClient.underwriterCode}</p>
                        </div>
                      </div>

                      {/* Document Verification Checklist */}
                      <div className="pt-6">
                        <h4 className="text-xs font-black font-mono text-gray-400 uppercase tracking-widest mb-4">
                          Document Verification Pipeline
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedClient.documents.map((doc, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-center justify-between p-4 bg-white dark:bg-navy-950/20 border border-gray-100 dark:border-navy-800 rounded-2xl shadow-sm hover:border-gray-200 dark:hover:border-navy-700 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                {getDocStatusIcon(doc.status)}
                                <span className="text-sm font-sans font-bold text-gray-800 dark:text-gray-200">
                                  {doc.name}
                                </span>
                              </div>
                              <span className={cn(
                                "text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                                doc.status === 'Verified' ? "bg-emerald-500/10 text-emerald-500" :
                                doc.status === 'Under Review' ? "bg-blue-500/10 text-blue-500 animate-pulse" :
                                "bg-amber-500/10 text-amber-500"
                              )}>
                                {doc.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Warning disclaimer */}
                      <div className="mt-8 p-4 bg-gray-100/50 dark:bg-navy-950/40 rounded-2xl flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <ShieldCheck size={16} className="text-brand-orange shrink-0" />
                        <span>AI Banker note: This file aligns with the <b>AI+HI Operation Model</b>. Any modification requires HR or MD authorization.</span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      ref={listRef}
                      className="divide-y divide-gray-50 dark:divide-navy-800"
                    >
                      {/* Zero results */}
                      {totalFilteredCount === 0 && (
                        <div className="p-12 text-center">
                          <p className="text-sm font-sans text-gray-500 dark:text-gray-400">
                            No match found for "<span className="font-bold">{query}</span>"
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            Search sections like "dashboard" or client details.
                          </p>
                        </div>
                      )}

                      {/* Navigation group */}
                      {filteredNav.length > 0 && (
                        <div className="p-4">
                          <h4 className="text-[10px] font-black font-mono text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 mb-2">
                            Quick Operations & Navigation
                          </h4>
                          <div className="space-y-1">
                            {filteredNav.map((item, idx) => {
                              const isActive = idx === selectedIndex;
                              return (
                                <button
                                  key={item.id}
                                  data-active={isActive}
                                  onMouseEnter={() => setSelectedIndex(idx)}
                                  onClick={triggerSelection}
                                  className={cn(
                                    "w-full text-left p-3.5 rounded-2xl flex items-center justify-between transition-all group",
                                    isActive 
                                      ? "bg-brand-orange text-navy-900 shadow-md shadow-brand-orange/10" 
                                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-800"
                                  )}
                                >
                                  <div className="flex items-center gap-3.5">
                                    <div className={cn(
                                      "p-2.5 rounded-xl transition-colors",
                                      isActive ? "bg-navy-900/10 text-navy-900" : "bg-gray-100 dark:bg-navy-800 text-gray-500 dark:text-gray-400"
                                    )}>
                                      <item.icon size={18} />
                                    </div>
                                    <div>
                                      <h5 className="font-sans font-bold text-sm leading-tight">{item.label}</h5>
                                      <p className={cn("text-xs font-sans mt-0.5", isActive ? "text-navy-900/70" : "text-gray-400 dark:text-gray-500")}>
                                        {item.desc}
                                      </p>
                                    </div>
                                  </div>
                                  <ArrowRight size={16} className={cn("opacity-0 transition-all", (isActive || query) && "opacity-100 translate-x-1")} />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Client leads group */}
                      {filteredClients.length > 0 && (
                        <div className="p-4">
                          <h4 className="text-[10px] font-black font-mono text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 mb-2">
                            Active Client Enquiries & Files ({filteredClients.length})
                          </h4>
                          <div className="space-y-1">
                            {filteredClients.map((client, idx) => {
                              const overallIndex = filteredNav.length + idx;
                              const isActive = overallIndex === selectedIndex;
                              return (
                                <button
                                  key={client.id}
                                  data-active={isActive}
                                  onMouseEnter={() => setSelectedIndex(overallIndex)}
                                  onClick={triggerSelection}
                                  className={cn(
                                    "w-full text-left p-3.5 rounded-2xl flex items-center justify-between transition-all group",
                                    isActive 
                                      ? "bg-brand-orange text-navy-900 shadow-md shadow-brand-orange/10" 
                                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-800"
                                  )}
                                >
                                  <div className="flex items-center gap-3.5">
                                    <div className={cn(
                                      "p-2.5 rounded-xl transition-colors",
                                      isActive ? "bg-navy-900/10 text-navy-900" : "bg-gray-100 dark:bg-navy-800 text-gray-500 dark:text-gray-400"
                                    )}>
                                      {client.type.includes('Business') ? <Building size={18} /> : <User size={18} />}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h5 className="font-sans font-bold text-sm leading-tight">{client.name}</h5>
                                        <span className={cn(
                                          "text-[8px] font-bold font-mono px-1.5 py-0.5 rounded-full uppercase tracking-tight",
                                          isActive ? "bg-navy-900/10 text-navy-900 border border-navy-900/20" : getStatusStyle(client.status)
                                        )}>
                                          {client.status}
                                        </span>
                                      </div>
                                      <p className={cn("text-xs font-sans mt-0.5 flex items-center gap-1.5", isActive ? "text-navy-900/70" : "text-gray-400 dark:text-gray-500")}>
                                        <span>{client.type}</span>
                                        <span className="w-1 h-1 bg-current rounded-full opacity-40"></span>
                                        <span>{client.amount}</span>
                                        <span className="w-1 h-1 bg-current rounded-full opacity-40"></span>
                                        <span className="font-mono text-[10px]">{client.phone}</span>
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-sans font-medium text-gray-400 dark:text-gray-500 tracking-wider group-hover:text-current">
                                      INSPECT
                                    </span>
                                    <ArrowUpRight size={16} className="opacity-60" />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer details */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-navy-950 border-t border-gray-100 dark:border-navy-800 text-xs text-gray-400 dark:text-gray-500 flex justify-between items-center select-none font-sans">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><span className="font-bold">↑↓</span> Navigate</span>
                  <span className="flex items-center gap-1"><span className="font-bold">↵</span> Select</span>
                  <span className="flex items-center gap-1"><span className="font-bold">ESC</span> Close</span>
                </div>
                <div>
                  AI + HI Banker Intelligence Layer
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
