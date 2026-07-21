
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

export function QuickLog() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startListening = async () => {
    setTranscript('');
    setShowPanel(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        setIsProcessing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64data = (reader.result as string).split(',')[1];
            
            // Transcribe using Gemini
            const transRes = await apiFetch("/api/gemini/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audioData: base64data, mimeType: "audio/webm" })
            });
            const transResult = await transRes.json();
            
            if (transResult.text) {
               setTranscript(transResult.text);
               processLog(transResult.text);
            } else {
               toast.error("Failed to transcribe audio");
               setShowPanel(false);
               setIsProcessing(false);
            }
          };
        } catch (e) {
          console.error(e);
          toast.error("Error processing audio");
          setShowPanel(false);
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error(err);
      toast.error("Microphone access denied or not supported.");
      setShowPanel(false);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  };

  const processLog = async (text: string) => {
    if (!text.trim()) {
      setIsProcessing(false);
      setShowPanel(false);
      return;
    }
    
    try {
      const response = await apiFetch("/api/dc/quick-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speechText: text })
      });
      
      const result = await response.json();
      
      if (result.ok) {
        toast.success(`Logged as ${result.data.category}`);
        setTimeout(() => setShowPanel(false), 3000);
      } else {
        toast.error("Failed to process log");
        setTimeout(() => setShowPanel(false), 2000);
      }
      
    } catch (err: any) {
      toast.error("Network error saving log");
      setShowPanel(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={isListening ? stopListening : startListening}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl relative z-50 text-white ${
          isListening ? 'bg-red-500 shadow-red-500/40' : 'bg-emerald-500 shadow-emerald-500/40'
        } group`}
      >
        {isListening ? <MicOff size={24} /> : <Mic size={24} />}
        <span className="absolute right-full mr-4 px-3 py-1 bg-navy-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Quick-Log (Voice)
        </span>
      </motion.button>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-20 right-0 w-80 bg-white dark:bg-navy-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-navy-800 p-4 z-40 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-3 text-emerald-500">
              <FileText size={18} />
              <span className="font-bold font-sans text-sm">Quick-Log Active</span>
            </div>
            
            <div className="bg-gray-50 dark:bg-navy-950 p-3 rounded-xl min-h-[80px] text-sm text-gray-700 dark:text-gray-300">
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500 py-2">
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing...</span>
                </div>
              ) : transcript ? (
                <p>"{transcript}"</p>
              ) : (
                <p className="text-gray-400 italic">Listening for updates, ideas, or meeting notes...</p>
              )}
            </div>
            
            {isListening && (
              <div className="flex items-center justify-center mt-3 h-1">
                <div className="w-1/2 h-full bg-emerald-500/30 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-emerald-500"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
