import { apiFetch } from '@/lib/api';
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, MessageSquare, Brain, Search, MapPin, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ReactMarkdown from 'react-markdown';
import { User as UserType } from '@/types';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function BulbhulChat({ user }: { user: UserType }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Namaste! I am Bulbhul, your AI Personal Banker and Banker Buddy from Divyanshi Capital. How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelMode, setModelMode] = useState<'flash' | 'pro' | 'lite'>('flash');
  const [useSearch, setUseSearch] = useState(true);
  const [useMaps, setUseMaps] = useState(false);
  
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
      const chatHistory = messages.map(m => ({
         role: m.role,
         parts: [{ text: m.content }]
      }));
      chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });

      let modelId = 'gemini-3.5-flash';
      if (modelMode === 'pro') modelId = 'gemini-3.1-pro-preview';
      if (modelMode === 'lite') modelId = 'gemini-3.1-flash-lite';

      const response = await apiFetch("/api/gemini/generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelId,
          useSearch: useSearch,
          useMaps: useMaps,
          thinkingLevel: modelMode === 'pro' ? 'HIGH' : undefined,
          systemInstruction: "You are Bulbhul AI, the world-class master AI layer of Divyanshi Capital. You act as the top-level intelligent Personal Banker and Buddy. Provide high-quality financial insights.",
          contents: chatHistory
        })
      });
      
      const result = await response.json();
      
      let assistantContent = "I'm sorry, I couldn't process that request.";
      if (result.text) {
        assistantContent = result.text;
      } else if (result.error) {
        assistantContent = `Error: ${result.error}`;
      }

      setMessages(prev => [...prev, { role: "assistant", content: assistantContent }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Error: Could not connect to Bulbhul AI." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 h-[calc(100vh-120px)] flex flex-col">
      <Card className="flex-1 flex flex-col border-none shadow-2xl shadow-gray-200/50 rounded-3xl overflow-hidden">
        <CardHeader className="bg-[#151619] text-white p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Bot className="text-white" size={28} />
            </div>
            <div>
              <CardTitle className="text-xl font-sans font-bold tracking-tight">Bulbhul AI Personal Banker</CardTitle>
              <CardDescription className="text-gray-400">Multi-Turn Chat with Advanced Intelligence</CardDescription>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex bg-navy-900 rounded-lg p-1 border border-navy-800">
                <button 
                  onClick={() => setModelMode('lite')}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors", modelMode === 'lite' ? "bg-blue-500/20 text-blue-400" : "text-gray-500 hover:text-gray-300")}
                >
                  <Zap size={14} /> Fast
                </button>
                <button 
                  onClick={() => setModelMode('flash')}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors", modelMode === 'flash' ? "bg-orange-500/20 text-orange-400" : "text-gray-500 hover:text-gray-300")}
                >
                  <Sparkles size={14} /> General
                </button>
                <button 
                  onClick={() => setModelMode('pro')}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors", modelMode === 'pro' ? "bg-purple-500/20 text-purple-400" : "text-gray-500 hover:text-gray-300")}
                >
                  <Brain size={14} /> Deep Think
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <div className="bg-gray-100 border-b border-gray-200 p-2 flex items-center justify-center gap-4">
           <span className="text-xs font-semibold text-gray-500 uppercase">Grounding Tools:</span>
           <button 
             onClick={() => setUseSearch(!useSearch)}
             className={cn("px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-all", useSearch ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50")}
           >
             <Search size={14} /> Google Search
           </button>
           <button 
             onClick={() => setUseMaps(!useMaps)}
             className={cn("px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-all", useMaps ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50")}
           >
             <MapPin size={14} /> Google Maps
           </button>
        </div>

        <CardContent className="flex-1 p-0 flex flex-col bg-white overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto" ref={scrollRef}>
            <div className="space-y-6">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-4 max-w-[85%]",
                    m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <Avatar className={cn(
                    "h-10 w-10 border-2 shrink-0",
                    m.role === 'user' ? "border-blue-500/10" : "border-orange-500/10"
                  )}>
                    {m.role === 'assistant' ? (
                      <div className="bg-orange-500 w-full h-full flex items-center justify-center">
                        <Bot className="text-white" size={20} />
                      </div>
                    ) : (
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=User`} />
                    )}
                  </Avatar>
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                    m.role === 'user' 
                      ? "bg-navy-900 text-white rounded-tr-none" 
                      : "bg-gray-50 text-gray-800 rounded-tl-none border border-gray-100"
                  )}>
                    <div className="markdown-body">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 max-w-[80%]">
                  <Avatar className="h-10 w-10 border-2 border-orange-500/10 shrink-0">
                    <div className="bg-orange-500 w-full h-full flex items-center justify-center">
                      <Bot className="text-white" size={20} />
                    </div>
                  </Avatar>
                  <div className="bg-gray-50 p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex items-center gap-2">
                    <Loader2 className="animate-spin text-orange-500" size={18} />
                    <span className="text-gray-400 text-xs font-medium">
                       {modelMode === 'pro' ? 'Bulbhul is deeply analyzing...' : 'Bulbhul is thinking...'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6 bg-white border-t border-gray-100">
            <div className="relative flex items-center gap-3">
              <Input
                placeholder="Type your message to Bulbhul..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="h-14 rounded-2xl border-gray-200 bg-white pr-16 focus-visible:ring-orange-500/20"
              />
              <Button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 h-10 w-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20"
              >
                <Send size={18} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
