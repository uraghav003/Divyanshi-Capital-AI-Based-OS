import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, RefreshCw, LogIn, LogOut, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { initAuth, googleSignIn, getAccessToken, logout } from '@/lib/firebase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '@/lib/api';

interface InboxProps {
  user: User;
}

interface EmailBadge {
  badge: string;
  color: string;
}

interface Email {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  body: string;
  badge?: EmailBadge;
  analyzing?: boolean;
}

export function Inbox({ user }: InboxProps) {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (_user, _token) => {
        setNeedsAuth(false);
        fetchEmails();
      },
      () => setNeedsAuth(true)
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setNeedsAuth(false);
        fetchEmails();
      }
    } catch (err) {
      toast.error('Failed to sign in with Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setNeedsAuth(true);
    setEmails([]);
  };

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        return;
      }

      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch messages');
      
      const data = await res.json();
      const messages = data.messages || [];

      const detailedEmails = await Promise.all(
        messages.map(async (msg: any) => {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const detail = await detailRes.json();
          
          let subject = 'No Subject';
          let from = 'Unknown';
          let date = '';
          
          detail.payload.headers.forEach((header: any) => {
            if (header.name === 'Subject') subject = header.value;
            if (header.name === 'From') from = header.value;
            if (header.name === 'Date') date = header.value;
          });

          // Try to extract body text
          let bodyText = detail.snippet; // Fallback to snippet
          
          return {
            id: detail.id,
            threadId: detail.threadId,
            snippet: detail.snippet,
            subject,
            from,
            date,
            body: bodyText
          };
        })
      );

      setEmails(detailedEmails);
      
      // Kick off analysis for all fetched emails
      detailedEmails.forEach(analyzeEmail);
    } catch (err) {
      toast.error('Failed to load emails');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeEmail = async (email: Email) => {
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, analyzing: true } : e));
    try {
      const res = await apiFetch('/api/dc/analyze-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: email.subject + "\n" + email.snippet })
      });
      const result = await res.json();
      if (result.ok && result.data) {
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, analyzing: false, badge: result.data } : e));
      } else {
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, analyzing: false } : e));
      }
    } catch (err) {
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, analyzing: false } : e));
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-sans text-navy-900 dark:text-white flex items-center gap-3">
            <Mail className="text-brand-orange" /> Enterprise Inbox
          </h1>
          <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mt-2">
            AI-Prioritized Workspace Mail
          </p>
        </div>
        {!needsAuth && (
          <div className="flex gap-4">
            <Button onClick={fetchEmails} variant="outline" disabled={isLoading} className="gap-2">
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button onClick={handleLogout} variant="outline" className="text-red-500 hover:text-red-600 gap-2">
              <LogOut size={16} /> Disconnect
            </Button>
          </div>
        )}
      </div>

      {needsAuth ? (
        <Card className="bg-white/50 dark:bg-navy-900/50 backdrop-blur-xl border-white/20">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-brand-orange/10 rounded-full flex items-center justify-center mb-6">
              <Mail size={48} className="text-brand-orange" />
            </div>
            <h2 className="text-2xl font-bold font-sans text-navy-900 dark:text-white mb-2">Connect your Workspace</h2>
            <p className="text-gray-500 mb-8 max-w-md text-center">
              Sign in with your Google account to access your inbox and automatically analyze emails for urgency and sentiment.
            </p>
            <button 
              onClick={handleLogin} 
              disabled={isLoggingIn}
              className="gsi-material-button bg-white text-gray-600 hover:bg-gray-50 font-medium py-3 px-6 rounded-lg flex items-center gap-3 shadow border"
            >
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {isLoading && emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 size={32} className="animate-spin text-brand-orange mb-4" />
              <p>Syncing inbox...</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p>No recent emails found.</p>
            </div>
          ) : (
            <AnimatePresence>
              {emails.map((email, idx) => (
                <motion.div
                  key={email.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-navy-900 border-gray-100 dark:border-navy-800">
                    <CardContent className="p-4 flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-navy-50 dark:bg-navy-800 flex items-center justify-center flex-shrink-0 text-navy-400 font-bold">
                        {email.from.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-sans font-semibold text-navy-900 dark:text-white truncate pr-4">
                            {email.from.split('<')[0].trim()}
                          </h4>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {new Date(email.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <h5 className="text-sm font-medium text-navy-800 dark:text-gray-200 truncate mb-1">
                          {email.subject}
                        </h5>
                        <p className="text-sm text-gray-500 truncate mb-3">
                          {email.snippet}
                        </p>
                        
                        <div className="flex items-center gap-2 h-6">
                          {email.analyzing ? (
                            <div className="flex items-center gap-2 text-xs text-brand-orange">
                              <Sparkles size={12} className="animate-pulse" />
                              Analyzing...
                            </div>
                          ) : email.badge ? (
                            <span 
                              className="px-2 py-1 text-xs font-semibold rounded-md border" 
                              style={{ 
                                color: email.badge.color, 
                                borderColor: email.badge.color + '40', 
                                backgroundColor: email.badge.color + '1A' 
                              }}
                            >
                              {email.badge.badge}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}
