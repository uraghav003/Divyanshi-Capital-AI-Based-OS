import { apiFetch } from "@/lib/api";
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Terminal, Bug, Database, Sparkles, Loader2, Activity, Search, Clock, UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function BulbhulDebugger() {
  // Since we don't pass user prop here normally based on App.tsx, but wait! App.tsx does not pass user to BulbhulDebugger.
  // I should fetch user from session storage or I can just update App.tsx to pass it.
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'System Diagnostics initialized. I am Bulbhul Debugger. I can analyze your data flows, identify bottlenecks, and suggest fixes for stuck cases. What data set or process should I analyze today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const stored = localStorage.getItem('dc_session');
      const user = stored ? JSON.parse(stored) : null;
      
      const response = await apiFetch("/api/dc/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, empCode: user?.id || "" })
      });
      const result = await response.json();
      
      let assistantContent = "Error";
      if (result.ok && result.data && result.data.response) {
        assistantContent = result.data.response;
      } else if (result.error) {
        assistantContent = `Error: ${result.error}`;
      } else {
        assistantContent = "Analysis failed. Please check system logs.";
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (error) {
      console.error("Debugger Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "CRITICAL ERROR: Connection to analysis engine lost." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 h-[calc(100vh-80px)] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Terminal className="w-8 h-8 text-blue-500" />
            <h2 className="text-3xl font-sans font-bold text-gray-900 dark:text-white tracking-tight">Data Debugger</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Deep analysis and system diagnostics</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col bg-white/50 dark:bg-navy-900/50 backdrop-blur-xl border-gray-100 dark:border-navy-800 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-navy-800 bg-gray-50/50 dark:bg-navy-950/50 py-4 flex-row items-center gap-4">
           <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
             <Activity className="w-4 h-4 text-green-500 animate-pulse" />
             SYSTEM ONLINE
           </div>
           <div className="flex items-center gap-2 text-xs font-mono text-gray-500 ml-4">
             <Database className="w-4 h-4 text-blue-500" />
             MASTER_DATA SYNCED
           </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4 max-w-[85%]",
                  message.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <Avatar className={cn(
                  "w-10 h-10 border-2 shadow-sm shrink-0",
                  message.role === 'user' ? "border-gray-200" : "border-blue-500 bg-blue-50"
                )}>
                  {message.role === 'user' ? (
                     <UserIcon className="w-5 h-5 text-gray-400 m-auto" />
                  ) : (
                     <Bug className="w-5 h-5 text-blue-600 m-auto" />
                  )}
                </Avatar>
                <div className={cn(
                  "rounded-2xl px-5 py-3 shadow-sm",
                  message.role === 'user' 
                    ? "bg-gray-900 text-white rounded-tr-sm" 
                    : "bg-white dark:bg-navy-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-navy-700 rounded-tl-sm prose prose-sm max-w-none dark:prose-invert font-mono text-sm"
                )}>
                  {message.role === 'assistant' ? (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 max-w-[80%]"
              >
                <Avatar className="w-10 h-10 border-2 border-blue-500 bg-blue-50 shrink-0 flex items-center justify-center">
                   <Loader2 className="w-5 h-5 text-blue-600 animate-spin m-auto" />
                </Avatar>
                <div className="rounded-2xl px-5 py-4 bg-white dark:bg-navy-800 border border-gray-100 dark:border-navy-700 rounded-tl-sm flex items-center gap-2 text-gray-500 font-mono text-xs">
                  Running diagnostics...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
        <div className="p-4 bg-white dark:bg-navy-950 border-t border-gray-100 dark:border-navy-800">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-center">
              <Terminal className="absolute left-4 text-gray-400" size={20} />
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter diagnostic command or query..."
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="h-14 font-mono rounded-xl border-gray-200 dark:border-navy-700 bg-gray-50 dark:bg-navy-900 pl-12 pr-16 focus-visible:ring-blue-500/20"
              />
              <Button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 h-10 w-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <Send size={18} />
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Common Queries:</span>
              <button onClick={() => setInput("Show unassigned cases from last 7 days")} className="text-[10px] font-mono text-blue-600 dark:text-blue-400 hover:underline">Unassigned Cases</button>
              <button onClick={() => setInput("Why was case #DC-8842 rejected?")} className="text-[10px] font-mono text-blue-600 dark:text-blue-400 hover:underline">Rejection Analysis</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
