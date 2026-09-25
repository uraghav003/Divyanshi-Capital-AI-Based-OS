import { apiFetch } from '@/lib/api';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, Loader2, MessageSquare, Brain, Search, MapPin, Zap, Mic, MicOff, Volume2, Globe, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { User as UserType } from '@/types';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Check for SpeechRecognition support across browsers
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function BulbhulChat({ user }: { user: UserType }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Namaste! I am Bulbhul, your AI Personal Banker and Banker Buddy from Divyanshi Capital. You can type or tap the microphone 🎙️ to dictate your loan inquiry details!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelMode, setModelMode] = useState<'flash' | 'pro' | 'lite'>('flash');
  const [useSearch, setUseSearch] = useState(true);
  const [useMaps, setUseMaps] = useState(false);
  
  // Microphone and dictation states
  const [isListening, setIsListening] = useState(false);
  const [dictationLang, setDictationLang] = useState<'hi-IN' | 'en-IN'>('en-IN');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [transcriptInterim, setTranscriptInterim] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputBeforeDictationRef = useRef<string>('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, transcriptInterim]);

  // Check speech recognition capability on mount
  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setSpeechSupported(false);
    }
  }, []);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    setTranscriptInterim('');
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionClass) {
      toast.error('Voice dictation is not supported in this browser. Please try Google Chrome or Microsoft Edge.');
      setSpeechSupported(false);
      return;
    }

    try {
      // Stop previous instance if any
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognitionClass();
      recognition.lang = dictationLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      inputBeforeDictationRef.current = input;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info(`Microphone active (${dictationLang === 'hi-IN' ? 'Hindi' : 'English'}). Speak your loan details clearly.`);
      };

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript + ' ';
          } else {
            interimText += transcript;
          }
        }

        setTranscriptInterim(interimText);

        if (finalText) {
          setInput(prev => {
            const base = prev.trim();
            const addition = finalText.trim();
            return base ? `${base} ${addition}` : addition;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          toast.error('Microphone access was denied. Please allow microphone permissions in your browser settings.');
        } else if (event.error === 'no-speech') {
          // No speech detected, keep listening or smoothly handle
        } else if (event.error === 'network') {
          toast.error('Speech recognition network error. Please check your internet connection.');
        }
        setIsListening(false);
        setTranscriptInterim('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setTranscriptInterim('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      toast.error('Failed to access microphone. Please check browser permissions.');
      setIsListening(false);
      setTranscriptInterim('');
    }
  }, [dictationLang, input]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSend = async () => {
    if (isListening) {
      stopListening();
    }

    const messageText = (input + (transcriptInterim ? ` ${transcriptInterim}` : '')).trim();
    if (!messageText || isLoading) return;

    setInput('');
    setTranscriptInterim('');
    setMessages(prev => [...prev, { role: 'user', content: messageText }]);
    setIsLoading(true);

    try {
      const chatHistory = messages.map(m => ({
         role: m.role,
         parts: [{ text: m.content }]
      }));
      chatHistory.push({ role: 'user', parts: [{ text: messageText }] });

      let modelId = 'gemini-3.8-flash';
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
          systemInstruction: "You are Bulbhul AI, the world-class master AI layer of Divyanshi Capital. You act as the top-level intelligent Personal Banker and Buddy. Provide high-quality financial insights and prompt assistance for loan inquiries (Personal, Home, Business, LAP, Auto loans).",
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

  const handleQuickLoanPrompt = (promptText: string) => {
    setInput(promptText);
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
              <CardTitle className="text-xl font-sans font-bold tracking-tight flex items-center gap-2">
                Bulbhul AI Personal Banker
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full">Voice Enabled</span>
              </CardTitle>
              <CardDescription className="text-gray-400">Multi-Turn Chat with Advanced Voice Dictation</CardDescription>
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
        
        <div className="bg-gray-100 border-b border-gray-200 p-2 px-4 flex flex-wrap items-center justify-between gap-2 text-xs">
           <div className="flex items-center gap-2">
             <span className="font-semibold text-gray-500 uppercase">Grounding:</span>
             <button 
               onClick={() => setUseSearch(!useSearch)}
               className={cn("px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-all", useSearch ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50")}
             >
               <Search size={13} /> Google Search
             </button>
             <button 
               onClick={() => setUseMaps(!useMaps)}
               className={cn("px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-all", useMaps ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50")}
             >
               <MapPin size={13} /> Google Maps
             </button>
           </div>

           {/* Voice Language Selector */}
           <div className="flex items-center gap-2">
             <span className="font-semibold text-gray-500 flex items-center gap-1">
               <Globe size={13} /> Voice Lang:
             </span>
             <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
               <button
                 type="button"
                 onClick={() => {
                   setDictationLang('en-IN');
                   if (isListening) stopListening();
                 }}
                 className={cn(
                   "px-2.5 py-0.5 text-xs font-medium rounded transition-colors",
                   dictationLang === 'en-IN' ? "bg-orange-500 text-white" : "text-gray-600 hover:text-gray-900"
                 )}
               >
                 English (IN)
               </button>
               <button
                 type="button"
                 onClick={() => {
                   setDictationLang('hi-IN');
                   if (isListening) stopListening();
                 }}
                 className={cn(
                   "px-2.5 py-0.5 text-xs font-medium rounded transition-colors",
                   dictationLang === 'hi-IN' ? "bg-orange-500 text-white" : "text-gray-600 hover:text-gray-900"
                 )}
               >
                 हिंदी (Hindi)
               </button>
             </div>
           </div>
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
          
          {/* Dictation suggestion chips */}
          <div className="px-6 py-2 bg-gray-50/70 border-t border-gray-100 flex items-center gap-2 overflow-x-auto text-xs text-gray-500">
            <span className="shrink-0 font-medium text-gray-400">Try asking:</span>
            <button
              onClick={() => handleQuickLoanPrompt("I need a ₹15,00,000 Personal Loan in Delhi. My monthly in-hand salary is ₹75,000. What are the best rates and banks?")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 text-gray-700 transition-colors"
            >
              💼 Personal Loan ₹15L (Delhi)
            </button>
            <button
              onClick={() => handleQuickLoanPrompt("I want a Home Loan Balance Transfer for ₹45,00,000 at lower interest rate. Current ROI is 9.5%.")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 text-gray-700 transition-colors"
            >
              🏠 Home Loan Transfer ₹45L
            </button>
            <button
              onClick={() => handleQuickLoanPrompt("Business Loan eligibility for GST turnover ₹1.5 Crore in Noida with 3 years ITR.")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 text-gray-700 transition-colors"
            >
              🏢 Business Loan ₹25L (Noida)
            </button>
          </div>

          <div className="p-6 bg-white border-t border-gray-100">
            {/* Live Dictation Active Banner */}
            {isListening && (
              <div className="mb-3 p-3 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-orange-950">
                      Listening ({dictationLang === 'hi-IN' ? 'Hindi' : 'English'})... Speak your loan requirements
                    </p>
                    {transcriptInterim && (
                      <p className="text-xs text-orange-700 italic mt-0.5 line-clamp-1">
                        "{transcriptInterim}"
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={stopListening}
                  className="h-7 px-3 text-xs bg-white text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                >
                  Done Dictating
                </Button>
              </div>
            )}

            <div className="relative flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <Input
                  placeholder={isListening ? "Listening... Speak loan details (e.g. loan amount, city, salary)..." : "Type or dictate loan inquiry to Bulbhul..."}
                  value={input + (isListening && transcriptInterim ? ` ${transcriptInterim}` : '')}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className={cn(
                    "h-14 rounded-2xl border-gray-200 bg-white pr-28 text-sm focus-visible:ring-orange-500/20",
                    isListening && "border-orange-400 ring-2 ring-orange-400/20 bg-orange-50/20"
                  )}
                />
                
                {/* Voice Dictation Button inside Input bar */}
                <div className="absolute right-2 flex items-center gap-1.5">
                  <Button
                    type="button"
                    onClick={toggleListening}
                    title={isListening ? "Stop listening" : "Dictate loan details with microphone"}
                    className={cn(
                      "h-10 px-3 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm",
                      isListening
                        ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse shadow-rose-500/30"
                        : "bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-gray-700 border border-gray-200"
                    )}
                  >
                    {isListening ? (
                      <>
                        <MicOff size={16} />
                        <span className="hidden sm:inline">Stop</span>
                      </>
                    ) : (
                      <>
                        <Mic size={16} className="text-orange-500" />
                        <span className="hidden sm:inline">Dictate</span>
                      </>
                    )}
                  </Button>

                  <Button 
                    onClick={handleSend}
                    disabled={isLoading || (!input.trim() && !transcriptInterim.trim())}
                    className="h-10 w-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 shrink-0"
                  >
                    <Send size={18} />
                  </Button>
                </div>
              </div>
            </div>

            {!speechSupported && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600">
                <AlertCircle size={12} />
                <span>Microphone speech recognition is best supported on Google Chrome, Safari, and Microsoft Edge.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
