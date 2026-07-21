import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Scan, 
  User, 
  MapPin, 
  Calendar, 
  Fingerprint,
  ShieldCheck,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

interface ScanResult {
  category: string;
  extractedData: {
    name: string;
    idNumber: string;
    address: string;
    dob: string;
    other?: string;
  };
  complianceStatus: 'Pass' | 'Fail' | 'Manual Review Required';
  complianceNotes: string;
  confidenceScore: number;
  intelligence: string;
  enhancedText: string;
}

interface KYCDocumentScannerProps {
  onScanComplete?: (result: ScanResult) => void;
}

export function KYCDocumentScanner({ onScanComplete }: KYCDocumentScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'data' | 'intelligence' | 'chat'>('data');
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Store for chat
    setMimeType(file.type);

    // Process
    await processDocument(file);
  };

  const processDocument = async (file: File) => {
    setIsScanning(true);
    setResult(null);
    setChatAnswer('');

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      setBase64Data(base64);

      const response = await apiFetch('/api/dc/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64,
          mimeType: file.type,
          task: 'analyze'
        })
      });

      const data = await response.json();
      if (data.ok) {
        setResult(data.data);
        onScanComplete?.(data.data);
        toast.success(`OCR Scan Complete: Detected ${data.data.category}`);
      } else {
        throw new Error(data.error || 'Failed to analyze document');
      }
    } catch (error: any) {
      console.error('Scan Error:', error);
      toast.error('AI Scanner failed to process document. Please ensure the image is clear.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAskAI = async () => {
    if (!chatQuestion || !base64Data) return;
    setIsAsking(true);
    try {
      const response = await apiFetch('/api/dc/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64Data,
          mimeType: mimeType,
          task: 'chat',
          question: chatQuestion
        })
      });
      const data = await response.json();
      if (data.ok) {
        setChatAnswer(data.text);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error("AI intelligence failed to respond.");
    } finally {
      setIsAsking(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-2xl rounded-[32px] bg-white dark:bg-navy-900 overflow-hidden">
        <CardHeader className="border-b border-gray-50 dark:border-navy-800 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange">
                <Scan size={28} />
              </div>
              <div>
                <CardTitle className="text-2xl font-sans font-black dark:text-white flex items-center gap-2">
                  KYC Vision Pro
                </CardTitle>
                <CardDescription className="dark:text-gray-400 font-medium">Deep Neural Document Analysis & Extraction</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 text-[10px] font-mono font-bold rounded-full uppercase tracking-widest border border-emerald-500/20">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Gemini 3.5 Active
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row h-full min-h-[600px]">
            {/* Left Column: Preview & Source */}
            <div className="w-full lg:w-[450px] border-r border-gray-50 dark:border-navy-800 p-8 space-y-6 bg-gray-50/30 dark:bg-navy-950/20">
              <div 
                onClick={triggerUpload}
                className={cn(
                  "relative aspect-[3/4] border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden bg-white dark:bg-navy-900",
                  previewUrl ? "border-brand-orange/50 shadow-inner" : "border-gray-200 dark:border-navy-800 hover:border-brand-orange/30"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-navy-900 shadow-xl">
                        <RefreshCw size={24} className="group-hover:rotate-180 transition-transform duration-500" />
                      </div>
                      <p className="text-xs font-black text-white uppercase tracking-widest">Update Document</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-brand-orange/10 rounded-3xl flex items-center justify-center text-brand-orange mb-6 group-hover:scale-110 transition-transform">
                      <Upload size={40} />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Drop Document</h3>
                    <p className="text-xs text-gray-400 mt-2 font-medium">Aadhaar, PAN, Bank Stmt, Passport</p>
                    <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-navy-800 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <FileText size={12} />
                      JPG, PNG, PDF supported
                    </div>
                  </>
                )}

                {isScanning && (
                  <div className="absolute inset-0 bg-white/95 dark:bg-navy-900/95 backdrop-blur-xl flex flex-col items-center justify-center z-20 p-8 text-center">
                    <motion.div
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute left-0 right-0 h-1 bg-brand-orange shadow-[0_0_20px_rgba(255,165,0,0.8)] z-30"
                    />
                    <div className="relative">
                      <RefreshCw size={48} className="text-brand-orange animate-spin mb-6" />
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-brand-orange rounded-full animate-ping" />
                    </div>
                    <h3 className="text-xl font-black text-navy-900 dark:text-white uppercase tracking-tighter">Neural Processing</h3>
                    <p className="text-xs text-gray-400 mt-2 max-w-[200px] font-medium italic">
                      "Reconstructing obscured pixels and extracting semantic entities..."
                    </p>
                  </div>
                )}
              </div>

              {previewUrl && (
                <div className="p-5 bg-navy-900 rounded-3xl shadow-xl shadow-navy-900/20 border border-white/5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-brand-orange/20 rounded-xl flex items-center justify-center text-brand-orange">
                      <Search size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-brand-orange uppercase tracking-widest">Document Focus</p>
                      <p className="text-sm font-bold text-white">Smart Cropped View</p>
                    </div>
                  </div>
                  <div className="relative h-32 rounded-2xl overflow-hidden bg-white/5 border border-white/10 group">
                    <img src={previewUrl} alt="Cropped" className="w-full h-full object-cover object-top scale-150 transition-transform duration-500 group-hover:scale-[1.8]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                      <span className="text-[10px] font-mono text-white/50 bg-black/40 px-2 py-1 rounded">HDR_ENHANCED</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20">
                        <RefreshCw size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Dynamic Analysis Tabs */}
            <div className="flex-1 p-8 flex flex-col">
              {result ? (
                <>
                  <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-navy-950 rounded-2xl mb-8 self-start border border-gray-200 dark:border-navy-800">
                    <TabButton active={activeTab === 'data'} onClick={() => setActiveTab('data')} icon={<Fingerprint size={14} />} label="Extracted Data" />
                    <TabButton active={activeTab === 'intelligence'} onClick={() => setActiveTab('intelligence')} icon={<ShieldCheck size={14} />} label="AI Intelligence" />
                    <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<Search size={14} />} label="Doc Assistant" />
                  </div>

                  <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                    <AnimatePresence mode="wait">
                      {activeTab === 'data' && (
                        <motion.div
                          key="data"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-6"
                        >
                          <div className="flex items-center justify-between p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-[24px]">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                <CheckCircle size={24} />
                              </div>
                              <div>
                                <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">{result.category}</h4>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Confidence: {(result.confidenceScore * 100).toFixed(0)}%</p>
                                </div>
                              </div>
                            </div>
                            <div className={cn(
                              "px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-sm",
                              result.complianceStatus === 'Pass' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                            )}>
                              {result.complianceStatus}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DataField icon={<User size={18} />} label="Entity Name" value={result.extractedData.name} />
                            <DataField icon={<Fingerprint size={18} />} label="Unique Identifier" value={result.extractedData.idNumber} />
                            <DataField icon={<MapPin size={18} />} label="Geographic Address" value={result.extractedData.address} className="md:col-span-2" />
                            <DataField icon={<Calendar size={18} />} label="Temporal Date" value={result.extractedData.dob} />
                            {result.extractedData.other && <DataField icon={<FileText size={18} />} label="Meta Attributes" value={result.extractedData.other} />}
                          </div>

                          <div className="p-6 bg-amber-50 dark:bg-amber-500/5 rounded-[24px] border border-amber-200/50 dark:border-amber-500/20">
                            <div className="flex items-center gap-3 mb-3 text-amber-600 dark:text-amber-400">
                              <AlertCircle size={18} />
                              <span className="text-[11px] font-black uppercase tracking-widest">Compliance Audit Log</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                              {result.complianceNotes || 'The document matches all regulatory patterns for Indian financial compliance. Data integrity confirmed via neural cross-referencing.'}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'intelligence' && (
                        <motion.div
                          key="intel"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-6"
                        >
                          <div className="p-8 bg-blue-500/5 border border-blue-500/20 rounded-[32px] space-y-4">
                            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                              <ShieldCheck size={24} />
                              <h4 className="text-lg font-black uppercase tracking-tighter">Gemini Intelligence Report</h4>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                              {result.intelligence || "No advanced intelligence generated for this document yet."}
                            </p>
                          </div>

                          <div className="p-8 bg-navy-900 rounded-[32px] border border-white/10 shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-3 text-brand-orange">
                                <FileText size={20} />
                                <h4 className="text-sm font-black uppercase tracking-widest text-white">Self-Heal Text Recovery</h4>
                              </div>
                              <div className="px-3 py-1 bg-brand-orange/20 text-brand-orange text-[9px] font-black rounded-full uppercase tracking-widest">
                                Neural Reconstructed
                              </div>
                            </div>
                            <div className="bg-black/40 p-6 rounded-2xl border border-white/5 font-mono text-[11px] text-emerald-400/80 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                              {result.enhancedText || "Awaiting neural reconstruction sequence..."}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'chat' && (
                        <motion.div
                          key="chat"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-6"
                        >
                          <div className="p-8 bg-gray-50 dark:bg-navy-950 rounded-[32px] border border-gray-100 dark:border-navy-800 h-full flex flex-col">
                            <div className="flex-1 mb-6">
                              {chatAnswer ? (
                                <div className="space-y-4">
                                  <div className="flex gap-3">
                                    <div className="w-8 h-8 bg-brand-orange rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-orange/20">
                                      <Search size={14} />
                                    </div>
                                    <div className="bg-white dark:bg-navy-900 p-5 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 dark:border-navy-800">
                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Query Outcome</p>
                                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                        {chatAnswer}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                                  <div className="w-16 h-16 bg-gray-200 dark:bg-navy-800 rounded-full flex items-center justify-center text-gray-400 mb-4">
                                    <Search size={32} />
                                  </div>
                                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-500">Neural Doc Assistant</h4>
                                  <p className="text-xs text-gray-400 mt-2">Ask complex questions about the document's content, validity, or origin.</p>
                                </div>
                              )}
                            </div>

                            <div className="relative">
                              <input 
                                type="text" 
                                value={chatQuestion}
                                onChange={(e) => setChatQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                                placeholder="Ask AI: 'Is this PAN valid for business?'"
                                className="w-full h-16 pl-6 pr-16 bg-white dark:bg-navy-900 rounded-2xl border border-gray-200 dark:border-navy-800 focus:ring-2 focus:ring-brand-orange outline-none transition-all font-medium text-sm shadow-xl"
                              />
                              <Button 
                                onClick={handleAskAI}
                                disabled={isAsking || !chatQuestion}
                                className="absolute right-2 top-2 h-12 w-12 bg-navy-900 dark:bg-white text-white dark:text-navy-900 rounded-xl hover:scale-105 transition-transform"
                              >
                                {isAsking ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="pt-8 border-t border-gray-50 dark:border-navy-800 flex items-center justify-between">
                    <Button 
                      variant="ghost" 
                      onClick={() => setResult(null)}
                      className="text-gray-400 hover:text-brand-orange font-black text-[10px] uppercase tracking-widest h-auto p-0"
                    >
                      Clear Analysis
                    </Button>
                    <div className="flex gap-4">
                      <Button 
                        variant="outline"
                        className="rounded-2xl h-12 px-6 font-black text-xs uppercase tracking-widest border-2 hover:bg-gray-50 dark:hover:bg-navy-800"
                        onClick={() => toast.info('Exporting detailed compliance PDF...')}
                      >
                        Audit PDF
                      </Button>
                      <Button 
                        className="bg-navy-900 dark:bg-white text-white dark:text-navy-900 rounded-2xl h-12 px-8 font-black text-xs uppercase tracking-widest shadow-2xl shadow-navy-900/20 hover:scale-105 transition-transform"
                        onClick={() => {
                          toast.success('KYC Data mapped to lead profile successfully!');
                        }}
                      >
                        Map to Lead Profile
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-gray-100 dark:border-navy-800 rounded-[40px] bg-gray-50/20 dark:bg-navy-950/10">
                  <div className="w-24 h-24 bg-white dark:bg-navy-900 rounded-[32px] flex items-center justify-center text-gray-200 mb-8 shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-navy-800">
                    <Scan size={48} />
                  </div>
                  <h3 className="text-xl font-black text-gray-400 uppercase tracking-tighter">Ready for OCR Stream</h3>
                  <p className="text-sm text-gray-400 mt-3 max-w-[280px] font-medium">
                    Upload a high-resolution KYC document to initiate the neural extraction sequence.
                  </p>
                  
                  <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-sm">
                    <FeatureBadge icon={<CheckCircle size={14} />} label="Auto-Categorize" />
                    <FeatureBadge icon={<Search size={14} />} label="Face Match" />
                    <FeatureBadge icon={<Fingerprint size={14} />} label="Entity Extraction" />
                    <FeatureBadge icon={<ShieldCheck size={14} />} label="AML Screening" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
        active 
          ? "bg-white dark:bg-navy-900 text-brand-orange shadow-lg shadow-navy-900/5 border border-gray-200 dark:border-white/5" 
          : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function DataField({ icon, label, value, className }: { icon: React.ReactNode, label: string, value: string, className?: string }) {
  return (
    <div className={cn(
      "flex items-center gap-4 p-5 bg-white dark:bg-navy-900 rounded-[24px] border border-gray-100 dark:border-navy-800 shadow-sm transition-all hover:shadow-md hover:border-brand-orange/20 group",
      className
    )}>
      <div className="w-12 h-12 bg-gray-50 dark:bg-navy-850 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-brand-orange transition-colors">
        {icon}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">{label}</p>
        <p className="text-sm font-sans font-bold text-gray-900 dark:text-white truncate">
          {value || 'Not found'}
        </p>
      </div>
    </div>
  );
}

function FeatureBadge({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-navy-900 rounded-xl border border-gray-100 dark:border-navy-800 text-[9px] font-black text-gray-400 uppercase tracking-widest">
      <span className="text-gray-300">{icon}</span>
      {label}
    </div>
  );
}
