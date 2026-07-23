import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Video, 
  Copy, 
  Plus, 
  Trash2, 
  Sparkles, 
  Mail, 
  Users, 
  Check, 
  ExternalLink, 
  LogOut, 
  Clock, 
  Settings, 
  Shield, 
  Info, 
  X,
  Loader2
} from 'lucide-react';
import { initAuth, googleSignIn, getAccessToken, logout } from '@/lib/firebase';
import { useEmployeeSync } from '@/lib/sync';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '@/lib/api';

interface GoogleMeetProps {
  user: User;
}

interface LocalMeeting {
  id: string;
  title: string;
  meetingUri: string;
  meetingCode: string;
  accessType: string;
  agenda: string;
  createdAt: string;
}

interface Employee {
  empCode: string;
  employeeName: string;
  employeeEmailId: string;
  mobile: string;
  activeStatus: string;
}

export function GoogleMeet({ user }: GoogleMeetProps) {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [meetings, setMeetings] = useState<LocalMeeting[]>([]);
  
  // Creation form state
  const [title, setTitle] = useState('');
  const [accessType, setAccessType] = useState('OPEN');
  const [agenda, setAgenda] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isAiDrafting, setIsAiDrafting] = useState(false);

  // Invitation drawer/form state
  const [activeMeetingForInvite, setActiveMeetingForInvite] = useState<LocalMeeting | null>(null);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteSubject, setInviteSubject] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const { employees } = useEmployeeSync();
  const [searchEmployee, setSearchEmployee] = useState('');

  // Load history & employees
  useEffect(() => {
    // History
    const stored = localStorage.getItem('dc_google_meet_history');
    if (stored) {
      try {
        setMeetings(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse meeting history', e);
      }
    }

    // Auth
    const unsubscribe = initAuth(
      (u, _token) => {
        setGoogleUser(u);
        setNeedsAuth(false);
      },
      () => {
        setGoogleUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Save history to localStorage
  const saveMeetings = (updated: LocalMeeting[]) => {
    setMeetings(updated);
    localStorage.setItem('dc_google_meet_history', JSON.stringify(updated));
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setNeedsAuth(false);
        toast.success('Successfully connected Google account');
      }
    } catch (err) {
      toast.error('Failed to sign in with Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setGoogleUser(null);
    setNeedsAuth(true);
    toast.success('Disconnected Google account');
  };

  const handleDraftAgendaWithAI = async () => {
    if (!title.trim()) {
      toast.error('Please enter a meeting title/topic first');
      return;
    }

    setIsAiDrafting(true);
    try {
      const prompt = `You are BULBHUL, the AI banker of Divyanshi Capital. Draft an elite, highly professional, structured bullet-point meeting agenda and formal description for a meeting titled: "${title}". Make it professional, conversion-focused, and well-organized for our team review or client consult. Provide output in clear plain text (no markdown, just bullets).`;
      
      const response = await apiFetch('/api/gemini/generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          model: 'gemini-3.6-flash'
        })
      });

      if (!response.ok) throw new Error('Failed to fetch agenda');
      const data = await response.json();
      setAgenda(data.text || '');
      toast.success('Bulbhul AI successfully drafted meeting agenda!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to draft agenda with AI');
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a meeting title');
      return;
    }

    setIsCreating(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        throw new Error('Google token expired or unavailable. Please sign in again.');
      }

      // v2 API endpoint
      const response = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: {
            accessType: accessType
          }
        })
      });

      if (!response.ok) {
        const errDetails = await response.text();
        throw new Error(`Google Meet creation failed: ${errDetails || response.statusText}`);
      }

      const space = await response.json();
      
      const newMeeting: LocalMeeting = {
        id: space.name?.replace('spaces/', '') || Math.random().toString(36).substring(7),
        title: title,
        meetingUri: space.meetingUri,
        meetingCode: space.meetingCode,
        accessType: accessType,
        agenda: agenda,
        createdAt: new Date().toISOString()
      };

      saveMeetings([newMeeting, ...meetings]);
      setTitle('');
      setAgenda('');
      toast.success('Google Meet space created successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create meeting space');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Meeting link copied to clipboard!');
  };

  const handleDeleteMeeting = (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this meeting from your history?');
    if (!confirmed) return;
    saveMeetings(meetings.filter(m => m.id !== id));
    toast.success('Meeting removed from history');
  };

  // Gmail Invitation sender
  const handleOpenInviteForm = (meeting: LocalMeeting) => {
    setActiveMeetingForInvite(meeting);
    setInviteEmails('');
    setInviteSubject(`Invitation: ${meeting.title} - Divyanshi Capital`);
    setInviteMessage(`Dear Team/Client,

You have been invited to a Google Meet session with Divyanshi Capital.

Topic: ${meeting.title}
Meeting Link: ${meeting.meetingUri}
Meeting Code: ${meeting.meetingCode}
Access Configuration: ${meeting.accessType}

Agenda / Core Objectives:
${meeting.agenda || 'No agenda specified.'}

Regards,
Divyanshi Capital Team
www.divyanshicapital.com`);
  };

  const handleSendInvite = async () => {
    if (!inviteEmails.trim()) {
      toast.error('Please enter at least one recipient email address');
      return;
    }

    setIsSendingInvite(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        throw new Error('Google token unavailable. Please sign in again.');
      }

      const emailsList = inviteEmails.split(',').map(e => e.trim()).filter(Boolean);
      
      for (const email of emailsList) {
        const mimeMessage = [
          `To: ${email}`,
          `Subject: ${inviteSubject}`,
          'Content-Type: text/plain; charset="utf-8"',
          'MIME-Version: 1.0',
          '',
          inviteMessage
        ].join('\n');

        const utf8Encoder = new TextEncoder();
        const bytes = utf8Encoder.encode(mimeMessage);
        const binaryString = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
        const rawBase64 = btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ raw: rawBase64 })
        });

        if (!response.ok) {
          throw new Error(`Gmail delivery failed for ${email}`);
        }
      }

      toast.success(`Invitation successfully dispatched to ${emailsList.length} recipient(s)`);
      setActiveMeetingForInvite(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to dispatch emails');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleQuickAddEmail = (email: string) => {
    if (inviteEmails.includes(email)) {
      toast.info('Email already added');
      return;
    }
    setInviteEmails(prev => prev ? `${prev}, ${email}` : email);
    toast.success(`Added ${email}`);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.employeeName?.toLowerCase().includes(searchEmployee.toLowerCase()) || 
    emp.employeeEmailId?.toLowerCase().includes(searchEmployee.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" id="meet-module">
      {/* Upper Status / Connection Header */}
      <div className="bg-white dark:bg-navy-900 border border-gray-100 dark:border-navy-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shadow-inner">
            <Video className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-sans font-extrabold text-navy-900 dark:text-white">Google Meet Center</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Integrate, schedule, and automate secure corporate calls</p>
          </div>
        </div>
        
        <div>
          {needsAuth ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="gsi-material-button font-sans font-bold shadow-md hover:shadow-lg transition-all"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents font-semibold">{isLoggingIn ? 'Connecting...' : 'Connect Workspace Account'}</span>
              </div>
            </motion.button>
          ) : (
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-navy-800 p-3 rounded-2xl border border-gray-100 dark:border-navy-700/50">
              <div className="flex items-center gap-3">
                {googleUser?.photoURL ? (
                  <img src={googleUser.photoURL} alt={googleUser.displayName || 'User'} className="w-9 h-9 rounded-full ring-2 ring-indigo-500/20" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-500 text-white font-black flex items-center justify-center text-xs">
                    {googleUser?.displayName?.charAt(0) || googleUser?.email?.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-sans font-black text-navy-900 dark:text-white leading-tight">{googleUser?.displayName || 'Workspace Active'}</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[160px] font-mono leading-none mt-1">{googleUser?.email}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Disconnect Google"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {needsAuth ? (
        <div className="bg-white dark:bg-navy-900 border border-gray-100 dark:border-navy-800 rounded-3xl p-12 text-center flex flex-col items-center max-w-xl mx-auto shadow-sm gap-4 mt-8">
          <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shadow-inner">
            <Shield className="w-10 h-10 animate-pulse" />
          </div>
          <h2 className="text-lg font-sans font-extrabold text-navy-900 dark:text-white">Workspace Permission Authorization Required</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            To create Google Meet conference spaces, view call permissions, and trigger direct invites via Gmail, please connect your company Google Account.
          </p>
          <button 
            onClick={handleLogin}
            className="px-6 py-3 bg-navy-900 dark:bg-white text-white dark:text-navy-900 rounded-xl font-semibold text-sm hover:opacity-90 active:scale-98 transition-all flex items-center gap-2 mt-2"
          >
            Authorize Connection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Space Generator Left/Top (Column 5) */}
          <div className="col-span-1 lg:col-span-5 space-y-6">
            <Card className="rounded-3xl border-gray-100 dark:border-navy-800 shadow-sm bg-white dark:bg-navy-900 overflow-hidden">
              <CardHeader className="border-b border-gray-50 dark:border-navy-800/50 pb-4">
                <CardTitle className="text-base font-sans font-extrabold text-navy-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-500" />
                  Instantiate New Meeting
                </CardTitle>
                <CardDescription className="text-xs">Configure a secure Meet space using REST API v2</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleCreateMeeting} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-sans font-bold text-gray-600 dark:text-gray-300 block">Meeting Topic / Title</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Loan Proposal Discussion"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-navy-950 rounded-xl border border-gray-100 dark:border-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-navy-900 dark:text-white font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-sans font-bold text-gray-600 dark:text-gray-300 block">Access Restrictiveness</label>
                    <div className="relative">
                      <select
                        value={accessType}
                        onChange={(e) => setAccessType(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-navy-950 rounded-xl border border-gray-100 dark:border-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-navy-900 dark:text-white font-medium appearance-none"
                      >
                        <option value="OPEN">OPEN (Anyone with link can join immediately)</option>
                        <option value="TRUSTED">TRUSTED (Organization members join directly)</option>
                        <option value="RESTRICTED">RESTRICTED (Invited participants only)</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <Settings className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-sans font-bold text-gray-600 dark:text-gray-300">Agenda / Discussion Points</label>
                      <button
                        type="button"
                        onClick={handleDraftAgendaWithAI}
                        disabled={isAiDrafting}
                        className="text-[10px] font-sans font-black text-indigo-500 hover:text-indigo-600 flex items-center gap-1 uppercase tracking-wider disabled:opacity-50"
                      >
                        {isAiDrafting ? (
                          <>
                            <Loader2 size={10} className="animate-spin" />
                            Drafting...
                          </>
                        ) : (
                          <>
                            <Sparkles size={10} />
                            Bulbhul AI Draft
                          </>
                        )}
                      </button>
                    </div>
                    <textarea 
                      rows={6}
                      placeholder="Enter details of what will be discussed or click AI Draft to generate high-quality outlines."
                      value={agenda}
                      onChange={(e) => setAgenda(e.target.value)}
                      className="w-full p-4 bg-gray-50 dark:bg-navy-950 rounded-xl border border-gray-100 dark:border-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-navy-900 dark:text-white font-medium resize-none font-sans"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="w-full py-4 bg-brand-orange hover:bg-brand-orange/90 text-navy-900 font-sans font-bold rounded-xl shadow-lg shadow-brand-orange/10 flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Meeting...
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4" />
                        Generate Google Meet
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* History and Invite Grid (Column 7) */}
          <div className="col-span-1 lg:col-span-7 space-y-6">
            <Card className="rounded-3xl border-gray-100 dark:border-navy-800 shadow-sm bg-white dark:bg-navy-900 overflow-hidden">
              <CardHeader className="border-b border-gray-50 dark:border-navy-800/50 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-sans font-extrabold text-navy-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    Generated Meeting History
                  </CardTitle>
                  <CardDescription className="text-xs">Quick access links & communication controllers</CardDescription>
                </div>
                {meetings.length > 0 && (
                  <button 
                    onClick={() => {
                      if (window.confirm('Clear all meeting records from local storage?')) {
                        saveMeetings([]);
                      }
                    }}
                    className="text-xs font-sans text-rose-500 hover:text-rose-600 font-semibold"
                  >
                    Clear History
                  </button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {meetings.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center gap-3">
                    <Video className="w-12 h-12 opacity-25" />
                    <p className="text-sm font-sans font-medium">No meeting records discovered</p>
                    <p className="text-xs max-w-xs leading-relaxed">Generated Google Meet spaces will accumulate and persist here securely.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-navy-800/40 max-h-[620px] overflow-y-auto">
                    {meetings.map((meet) => (
                      <div key={meet.id} className="p-5 hover:bg-gray-50/50 dark:hover:bg-navy-800/10 transition-colors space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-sans font-extrabold text-navy-900 dark:text-white truncate max-w-[280px] md:max-w-[380px] text-sm" title={meet.title}>
                              {meet.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="px-2 py-0.5 bg-indigo-500/10 text-[10px] font-mono text-indigo-600 rounded-md font-bold">
                                {meet.meetingCode}
                              </span>
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-navy-800 text-[10px] text-gray-500 dark:text-gray-400 rounded-md font-mono">
                                Access: {meet.accessType}
                              </span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                {new Date(meet.createdAt).toLocaleDateString()} at {new Date(meet.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleCopyLink(meet.meetingUri)}
                              className="p-2 text-gray-400 hover:text-indigo-500 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
                              title="Copy URL"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              onClick={() => handleOpenInviteForm(meet)}
                              className="p-2 text-gray-400 hover:text-indigo-500 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
                              title="Send Invites"
                            >
                              <Mail size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteMeeting(meet.id)}
                              className="p-2 text-gray-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                              title="Remove Record"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {meet.agenda && (
                          <div className="bg-gray-50/50 dark:bg-navy-950/30 rounded-2xl p-3 border border-gray-100/50 dark:border-navy-800/30">
                            <h4 className="text-[10px] uppercase tracking-widest text-gray-400 font-mono mb-1 font-black">Agenda</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-300 font-sans line-clamp-3 leading-relaxed whitespace-pre-wrap">{meet.agenda}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => window.open(meet.meetingUri, '_blank')}
                            className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 dark:text-indigo-400 font-sans font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-indigo-100/10"
                          >
                            <ExternalLink size={14} />
                            Join Call Room
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Invitation Modal/Drawer */}
      <AnimatePresence>
        {activeMeetingForInvite && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-navy-900 border border-gray-100 dark:border-navy-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-50 dark:border-navy-800/50 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-sans font-extrabold text-navy-900 dark:text-white">Email Meeting Invitation</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Send high-quality email invites directly from your Gmail account</p>
                </div>
                <button 
                  onClick={() => setActiveMeetingForInvite(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden flex-1">
                {/* Email Form Left (Col 7) */}
                <div className="col-span-1 lg:col-span-7 p-6 space-y-4 overflow-y-auto">
                  <div className="space-y-2">
                    <label className="text-xs font-sans font-bold text-gray-600 dark:text-gray-300 block">Recipient Emails (Comma-separated)</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. client@gmail.com, md@divyanshicapital.com"
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-navy-950 rounded-xl border border-gray-100 dark:border-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-navy-900 dark:text-white font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-sans font-bold text-gray-600 dark:text-gray-300 block">Subject Line</label>
                    <input 
                      type="text"
                      required
                      value={inviteSubject}
                      onChange={(e) => setInviteSubject(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-navy-950 rounded-xl border border-gray-100 dark:border-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-navy-900 dark:text-white font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-sans font-bold text-gray-600 dark:text-gray-300 block">Message Body</label>
                    <textarea 
                      rows={10}
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      className="w-full p-4 bg-gray-50 dark:bg-navy-950 rounded-xl border border-gray-100 dark:border-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-navy-900 dark:text-white font-medium resize-none font-mono text-xs leading-relaxed"
                    />
                  </div>
                </div>

                {/* Directory Selector Right (Col 5) */}
                <div className="col-span-1 lg:col-span-5 bg-gray-50/50 dark:bg-navy-950/20 p-6 border-t lg:border-t-0 lg:border-l border-gray-50 dark:border-navy-800/50 flex flex-col overflow-hidden">
                  <span className="text-[10px] font-sans font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                    <Users size={12} />
                    Enterprise Team Directory
                  </span>
                  
                  <div className="mb-4">
                    <input 
                      type="text"
                      placeholder="Search employees..."
                      value={searchEmployee}
                      onChange={(e) => setSearchEmployee(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-navy-900 rounded-xl border border-gray-100 dark:border-navy-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-navy-900 dark:text-white"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {filteredEmployees.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-xs">
                        No employees detected.
                      </div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <div 
                          key={emp.empCode}
                          onClick={() => handleQuickAddEmail(emp.employeeEmailId)}
                          className="p-2.5 bg-white dark:bg-navy-900 border border-gray-100 dark:border-navy-800/60 rounded-xl flex items-center justify-between hover:border-indigo-500/30 cursor-pointer group transition-all"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-sans font-extrabold text-navy-900 dark:text-white group-hover:text-indigo-500 truncate leading-none">
                              {emp.employeeName}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-1 truncate">
                              {emp.employeeEmailId}
                            </p>
                          </div>
                          <span className="px-1.5 py-0.5 bg-gray-50 dark:bg-navy-800 text-[8px] font-mono font-bold text-gray-500 dark:text-gray-400 rounded group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                            {emp.empCode}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-50 dark:border-navy-800/50 flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setActiveMeetingForInvite(null)}
                  className="px-5 py-2.5 font-sans font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendInvite}
                  disabled={isSendingInvite}
                  className="px-6 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-navy-900 font-sans font-bold text-xs flex items-center gap-1.5 rounded-xl shadow-lg shadow-brand-orange/10"
                >
                  {isSendingInvite ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Dispatched...
                    </>
                  ) : (
                    <>
                      <Mail size={12} />
                      Send Invite via Gmail
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
