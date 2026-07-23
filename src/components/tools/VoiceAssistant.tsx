
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Bot, Sparkles, Volume2, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

const pcmToBase64 = (pcmData: Float32Array) => {
  const arr = new Int16Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    const s = Math.max(-1, Math.min(1, pcmData[i]));
    arr[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const buffer = new Uint8Array(arr.buffer);
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
};

const base64ToPcm = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const buffer = bytes.buffer;
  const view = new DataView(buffer);
  const pcm = new Float32Array(buffer.byteLength / 2);
  for (let i = 0; i < pcm.length; i++) {
    pcm[i] = view.getInt16(i * 2, true) / 32768;
  }
  return pcm;
};

export function VoiceAssistant({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isProcessingSummary, setIsProcessingSummary] = useState(false);
  const [isExecutingQuickCommand, setIsExecutingQuickCommand] = useState(false);
  const [summaryData, setSummaryData] = useState<{summary: string, tasks: string[]} | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const retryCountRef = useRef<number>(0);
  const closedByUserRef = useRef<boolean>(false);
  const reconnectTimeoutRef = useRef<any>(null);

  const safeSend = (ws: WebSocket | null, data: string) => {
    if (!ws) return;
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(data);
      } catch (e) {
        console.error("safeSend error:", e);
      }
    }
  };

  const safeClose = (ws: WebSocket | null) => {
    if (!ws) return;
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.close();
      } catch (e) {
        console.error("safeClose error:", e);
      }
    } else if (ws.readyState === WebSocket.CONNECTING) {
      const onCloseDeferred = () => {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        } catch (e) {
          console.error("Deferred safeClose error:", e);
        }
      };
      ws.addEventListener('open', onCloseDeferred, { once: true });
    }
  };

  const stopListening = () => {
    setIsListening(false);
    closedByUserRef.current = true;
    retryCountRef.current = 0;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      safeClose(wsRef.current);
      wsRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop(); // This triggers onstop
    } else {
        cleanupAudio();
    }
  };
  
  const cleanupAudio = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (inputCtxRef.current) {
      inputCtxRef.current.close();
      inputCtxRef.current = null;
    }
    if (outputCtxRef.current) {
      outputCtxRef.current.close();
      outputCtxRef.current = null;
    }
  };

  const processSummary = async (blob: Blob) => {
    setIsProcessingSummary(true);
    try {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64data = (reader.result as string).split(',')[1];
            const response = await apiFetch("/api/gemini/post-call-summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audioData: base64data, mimeType: "audio/webm" })
            });
            const data = await response.json();
            if (data.result) {
                setSummaryData(data.result);
            }
            setIsProcessingSummary(false);
        };
    } catch (e) {
        console.error(e);
        setIsProcessingSummary(false);
    }
  };

  const handleQuickCommand = async (command: string) => {
    setIsExecutingQuickCommand(true);
    try {
      const response = await apiFetch("/api/dc/quick-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command })
      });
      const data = await response.json();
      if (data.ok) {
        toast.success(data.message || "Command executed successfully!");
      } else {
        toast.error(data.error || "Failed to execute command.");
      }
    } catch (error) {
      console.error("Quick command error:", error);
      toast.error("An error occurred while executing the quick command.");
    } finally {
      setIsExecutingQuickCommand(false);
    }
  };

  const connectWebSocket = (processor: ScriptProcessorNode, outputAudioCtx: AudioContext) => {
    if (closedByUserRef.current) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/live`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    processor.onaudioprocess = (e) => {
      const base64 = pcmToBase64(e.inputBuffer.getChannelData(0));
      safeSend(ws, JSON.stringify({ audio: base64 }));
    };

    ws.onmessage = (event) => {
      try {
          const msg = JSON.parse(event.data);
          if (msg.audio) {
            const pcm = base64ToPcm(msg.audio);
            const buffer = outputAudioCtx.createBuffer(1, pcm.length, 24000);
            buffer.getChannelData(0).set(pcm);
            
            const playSource = outputAudioCtx.createBufferSource();
            playSource.buffer = buffer;
            playSource.connect(outputAudioCtx.destination);
            
            const currentTime = outputAudioCtx.currentTime;
            if (nextStartTimeRef.current < currentTime) {
              nextStartTimeRef.current = currentTime + 0.1;
            }
            playSource.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
          }
          if (msg.interrupted) {
             nextStartTimeRef.current = outputAudioCtx.currentTime;
          }
      } catch(e) {
          console.error(e);
      }
    };

    ws.onopen = () => {
      retryCountRef.current = 0;
    };
    
    ws.onerror = (e) => {
        console.error("WS error:", e);
    };
    
    ws.onclose = () => {
        if (!closedByUserRef.current) {
          if (retryCountRef.current >= 3) {
            console.error("WebSocket connection failed permanently after 3 attempts.");
            setError("WebSocket Handshake Failure: Unable to establish connection to server (Max 3 attempts exceeded).");
            stopListening();
            
            // Dispatch custom event to notify ErrorBoundary specifically of the WS failure
            window.dispatchEvent(new CustomEvent('dc-custom-error', {
              detail: {
                error: new Error('WebSocket Handshake Failure: The Live voice assistant WebSocket connection could not be established after 3 attempts in the production build lifecycle.')
              }
            }));
            return;
          }

          const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 15000);
          console.log(`WebSocket closed. Reconnecting in ${backoffDelay}ms (attempt ${retryCountRef.current + 1})...`);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            retryCountRef.current += 1;
            connectWebSocket(processor, outputAudioCtx);
          }, backoffDelay);
        } else {
          cleanupAudio();
        }
    };
  };

  const startListening = async () => {
    setError(null);
    setSummaryData(null);
    setIsListening(true);
    nextStartTimeRef.current = 0;
    audioChunksRef.current = [];
    closedByUserRef.current = false;
    retryCountRef.current = 0;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    try {
      const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
      inputCtxRef.current = inputAudioCtx;
      const outputAudioCtx = new AudioContext({ sampleRate: 24000 });
      outputCtxRef.current = outputAudioCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Setup MediaRecorder for post-call summary
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          cleanupAudio();
          processSummary(blob);
      };
      mediaRecorder.start();

      const source = inputAudioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      source.connect(processor);
      processor.connect(inputAudioCtx.destination);

      connectWebSocket(processor, outputAudioCtx);

    } catch (err: any) {
      console.error(err);
      setError("Failed to access microphone or connect to AI server. " + err.message);
      stopListening();
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white dark:bg-navy-900 relative">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Bot size={200} />
        </div>
        <CardHeader className="bg-emerald-500 text-white p-8 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-sans font-bold flex items-center gap-3">
                <Sparkles className="text-emerald-200" />
                Live Conversational AI
              </CardTitle>
              <CardDescription className="text-emerald-100 mt-2 text-lg">
                Have a real-time conversation with the assistant powered by Gemini Live API.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-12 flex flex-col items-center justify-center min-h-[400px] relative z-10">
          
          <div className="relative mb-12">
            {isListening && (
              <motion.div 
                className="absolute inset-0 bg-emerald-500 rounded-full opacity-20"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            )}
            <Button
              size="lg"
              onClick={isListening ? stopListening : startListening}
              className={`w-32 h-32 rounded-full shadow-2xl relative z-10 transition-all duration-300 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
            >
              {isListening ? <Volume2 size={48} className="text-white animate-pulse" /> : <Mic size={48} className="text-white" />}
            </Button>
          </div>

          <div className="w-full max-w-2xl bg-gray-50 dark:bg-navy-950 p-6 rounded-2xl border border-gray-100 dark:border-navy-800 min-h-[120px] flex flex-col items-center justify-center text-center">
            {isListening ? (
              <p className="text-xl font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                 <Loader2 className="animate-spin" /> Connected & Listening...
              </p>
            ) : isProcessingSummary ? (
              <p className="text-xl font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                 <Loader2 className="animate-spin" /> Generating Meeting Notes & Next Steps...
              </p>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 font-medium text-lg">Tap the microphone and start speaking naturally...</p>
            )}
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 w-full max-w-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400"
            >
              <AlertTriangle size={20} />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}

        </CardContent>
      </Card>
      
      <AnimatePresence>
      {summaryData && (
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="w-full bg-white dark:bg-navy-900 rounded-3xl p-8 border border-gray-100 dark:border-navy-800 shadow-xl"
          >
             <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                     <CheckCircle2 size={20} />
                 </div>
                 <h2 className="text-2xl font-bold font-sans dark:text-white">Meeting Summary & Next Steps</h2>
             </div>
             
             <div className="mb-6">
                 <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Summary</h3>
                 <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-navy-950 p-4 rounded-2xl">
                     {summaryData.summary}
                 </p>
             </div>
             
             {summaryData.tasks && summaryData.tasks.length > 0 && (
                 <div>
                     <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Suggested Tasks</h3>
                     <div className="space-y-3">
                         {summaryData.tasks.map((task, idx) => (
                             <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-navy-950 p-4 rounded-2xl border border-gray-100 dark:border-navy-800 hover:border-blue-200 transition-colors">
                                 <span className="text-gray-800 dark:text-gray-200">{task}</span>
                                 <Button size="sm" variant="outline" className="shrink-0 text-blue-600 border-blue-200 hover:bg-blue-50">
                                     Add to Tasks
                                 </Button>
                             </div>
                         ))}
                     </div>
                 </div>
             )}
          </motion.div>
      )}
      </AnimatePresence>
      
      {/* Quick Commands Feature */}
      <div className="w-full space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-orange/10 text-brand-orange rounded-xl flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <h2 className="text-2xl font-bold font-sans dark:text-white">Quick Bulk Commands</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QuickCommandCard 
            title="Email to Task"
            description="Add all urgent emails to task list"
            icon={<AlertTriangle size={24} className="text-amber-500" />}
            onClick={() => handleQuickCommand('urgent_emails_to_tasks')}
            loading={isExecutingQuickCommand}
          />
          <QuickCommandCard 
            title="Lead Follow-up"
            description="Send follow-up template to today's leads"
            icon={<CheckCircle2 size={24} className="text-emerald-500" />}
            onClick={() => handleQuickCommand('followup_today_leads')}
            loading={isExecutingQuickCommand}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {[
          { title: 'Natural Chat', text: '"What is our marketing strategy today?"' },
          { title: 'Brainstorm', text: '"Can you help me plan a campaign?"' },
          { title: 'Insights', text: '"What are the current interest rates?"' }
        ].map((ex, i) => (
          <div key={i} className="bg-white dark:bg-navy-900 p-6 rounded-2xl border border-gray-100 dark:border-navy-800 shadow-sm flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-gray-100 dark:bg-navy-800 rounded-full flex items-center justify-center mb-4">
              <Sparkles size={18} className="text-gray-500" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">{ex.title}</h3>
            <p className="text-sm text-gray-500 italic">{ex.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickCommandCard({ title, description, icon, onClick, loading }: { title: string, description: string, icon: React.ReactNode, onClick: () => void, loading: boolean }) {
  return (
    <Card 
      className="border-none shadow-xl rounded-2xl bg-white dark:bg-navy-900 p-6 hover:shadow-2xl transition-all cursor-pointer group overflow-hidden relative"
      onClick={onClick}
    >
      <div className="flex items-center gap-4 relative z-10">
        <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-navy-950 flex items-center justify-center group-hover:scale-110 transition-transform">
          {loading ? <Loader2 className="animate-spin text-gray-400" /> : icon}
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
        {icon}
      </div>
    </Card>
  );
}
