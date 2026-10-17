import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Camera, 
  X, 
  RotateCw, 
  Check, 
  RefreshCw, 
  Upload, 
  SwitchCamera, 
  Zap, 
  ZapOff, 
  FileText, 
  Sparkles, 
  AlertCircle,
  Eye,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useSettings } from '@/lib/settings';

export interface ScannedKYCDocument {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  filterMode: 'grayscale' | 'bw' | 'color';
  enhanced: boolean;
  sizeKb: number;
  scannedAt: string;
}

interface KYCDocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentCaptured: (doc: ScannedKYCDocument) => void;
  initialDocType?: string;
}

export const KYC_DOC_TYPES = [
  'Aadhaar Card (Front)',
  'Aadhaar Card (Back)',
  'PAN Card',
  'Income Proof / Salary Slip',
  'Bank Statement (3 Months)',
  'Electricity / Utility Bill',
  'Voter ID / Driving License',
  'Other KYC Document'
];

type FilterMode = 'grayscale' | 'bw' | 'color';

export function KYCDocumentScannerModal({
  isOpen,
  onClose,
  onDocumentCaptured,
  initialDocType = 'PAN Card'
}: KYCDocumentScannerModalProps) {
  const { playFeedback } = useSettings();

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Review & processing state
  const [selectedDocType, setSelectedDocType] = useState(initialDocType);
  const [customDocName, setCustomDocName] = useState('');
  const [capturedRawDataUrl, setCapturedRawDataUrl] = useState<string | null>(null);
  const [processedDataUrl, setProcessedDataUrl] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('grayscale');
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileInputRef] = [useRef<HTMLInputElement | null>(null)];

  // Update doc type if prop changes
  useEffect(() => {
    if (initialDocType) {
      setSelectedDocType(initialDocType);
    }
  }, [initialDocType]);

  // Start Camera Stream
  const startCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    setCameraActive(false);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by this browser.');
      }

      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        // Fallback to basic video constraint if ideal constraints fail
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }

      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      if (track && 'getCapabilities' in track) {
        try {
          const capabilities = (track as any).getCapabilities();
          setTorchAvailable(!!capabilities.torch);
        } catch (e) {
          setTorchAvailable(false);
        }
      } else {
        setTorchAvailable(false);
      }
    } catch (err: any) {
      console.warn('Unable to access device camera:', err);
      let msg = 'Could not access device camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera permissions in your browser or upload a file directly.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No video camera detected on this device. You can upload an image file instead.';
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  }, [facingMode]);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  // Initialize camera when modal opens, stop when closes
  useEffect(() => {
    if (isOpen && !capturedRawDataUrl) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, capturedRawDataUrl, startCamera, stopCamera]);

  // Toggle Torch/Flash
  const toggleTorch = async () => {
    if (!streamRef.current || !torchAvailable) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const newTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: newTorch }]
      });
      setTorchOn(newTorch);
      playFeedback('click');
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Toggle Camera Front / Back
  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    playFeedback('click');
    await startCamera(nextMode);
  };

  // Apply Grayscale Enhancement & Image Processing
  const processImage = useCallback((rawBase64: string, mode: FilterMode, rotation: number) => {
    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const isRotated90or270 = rotation % 180 !== 0;
      const originalWidth = img.naturalWidth || img.width;
      const originalHeight = img.naturalHeight || img.height;

      // Cap maximum dimensions to 1400px for high clarity while keeping base64 payload light (~100KB)
      const maxDim = 1400;
      let scale = 1;
      if (Math.max(originalWidth, originalHeight) > maxDim) {
        scale = maxDim / Math.max(originalWidth, originalHeight);
      }

      const drawWidth = Math.round(originalWidth * scale);
      const drawHeight = Math.round(originalHeight * scale);

      const canvasWidth = isRotated90or270 ? drawHeight : drawWidth;
      const canvasHeight = isRotated90or270 ? drawWidth : drawHeight;

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        setProcessedDataUrl(rawBase64);
        setIsProcessing(false);
        return;
      }

      // Handle Rotation
      ctx.save();
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      // Process Pixel Data if filter applied
      if (mode === 'grayscale' || mode === 'bw') {
        const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        const data = imageData.data;
        const totalPixels = data.length / 4;

        // Pass 1: Compute histogram & min/max luminance for auto-levels contrast stretching
        let minLum = 255;
        let maxLum = 0;
        const lums = new Uint8Array(totalPixels);

        // Sample every 4th pixel to make histogram lighting analysis ultra-fast
        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Rec 601 Luminance formula for document scanning
          const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          lums[p] = lum;
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
        }

        // Avoid division by zero
        if (maxLum <= minLum) {
          maxLum = 255;
          minLum = 0;
        }

        // Soften clipping bounds (5% margin) to prevent noise distortion
        const effectiveMin = Math.min(minLum + 10, 80);
        const effectiveMax = Math.max(maxLum - 10, 180);
        const range = effectiveMax - effectiveMin || 1;

        // Pass 2: Apply transformation
        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
          const rawLum = lums[p];

          if (mode === 'grayscale') {
            // Contrast enhancement with auto-levels stretching
            let stretched = ((rawLum - effectiveMin) / range) * 255;
            stretched = Math.max(0, Math.min(255, stretched));

            // Gamma adjustment (~0.9) to brighten document paper background while preserving dark text
            const enhanced = Math.round(255 * Math.pow(stretched / 255, 0.9));

            data[i] = enhanced;
            data[i + 1] = enhanced;
            data[i + 2] = enhanced;
          } else if (mode === 'bw') {
            // High contrast document thresholding for stamped / handwritten clarity
            const threshold = effectiveMin + range * 0.48;
            const bwVal = rawLum > threshold ? 255 : 0;
            data[i] = bwVal;
            data[i + 1] = bwVal;
            data[i + 2] = bwVal;
          }
        }

        ctx.putImageData(imageData, 0, 0);
      }

      const finalDataUrl = canvas.toDataURL('image/jpeg', 0.86);
      setProcessedDataUrl(finalDataUrl);
      setIsProcessing(false);
    };

    img.src = rawBase64;
  }, []);

  // When filterMode or rotation changes, re-process image
  useEffect(() => {
    if (capturedRawDataUrl) {
      processImage(capturedRawDataUrl, filterMode, rotationDegrees);
    }
  }, [capturedRawDataUrl, filterMode, rotationDegrees, processImage]);

  // Capture Photo from Live Video Feed
  const handleCapture = () => {
    if (!videoRef.current) return;
    playFeedback('click');

    const video = videoRef.current;
    const vWidth = video.videoWidth || 1280;
    const vHeight = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = vWidth;
    canvas.height = vHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, vWidth, vHeight);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.92);

    stopCamera();
    setCapturedRawDataUrl(rawDataUrl);
    setFilterMode('grayscale');
    setRotationDegrees(0);
    processImage(rawDataUrl, 'grayscale', 0);
  };

  // Upload Photo File fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        stopCamera();
        setCapturedRawDataUrl(result);
        setFilterMode('grayscale');
        setRotationDegrees(0);
        processImage(result, 'grayscale', 0);
        playFeedback('success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Retake Photo
  const handleRetake = () => {
    playFeedback('click');
    setCapturedRawDataUrl(null);
    setProcessedDataUrl(null);
    setRotationDegrees(0);
    startCamera();
  };

  // Rotate Photo by 90° Clockwise
  const handleRotate = () => {
    playFeedback('click');
    setRotationDegrees((prev) => (prev + 90) % 360);
  };

  // Confirm and attach scanned document to form
  const handleConfirm = () => {
    if (!processedDataUrl) return;

    // Calculate approx size in KB
    const head = 'data:image/jpeg;base64,';
    const base64Length = processedDataUrl.length - head.length;
    const sizeKb = Math.round((base64Length * 3) / 4 / 1024);

    const docName = customDocName.trim() || selectedDocType;

    const scannedDoc: ScannedKYCDocument = {
      id: `kyc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: docName,
      type: selectedDocType,
      dataUrl: processedDataUrl,
      filterMode,
      enhanced: filterMode === 'grayscale' || filterMode === 'bw',
      sizeKb,
      scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    onDocumentCaptured(scannedDoc);
    playFeedback('success');
    toast.success(`${docName} scanned and attached!`, {
      description: `Clarity enhanced (${filterMode}) · ${sizeKb} KB`
    });

    handleCloseModal();
  };

  const handleCloseModal = () => {
    stopCamera();
    setCapturedRawDataUrl(null);
    setProcessedDataUrl(null);
    setRotationDegrees(0);
    setCustomDocName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-navy-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-navy-800 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-navy-800 bg-gray-50/50 dark:bg-navy-950/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
              <Camera size={19} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                KYC Document Scanner
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  HD CAMERA
                </span>
              </h3>
              <p className="text-xs text-gray-500">Live device capture with automatic grayscale clarity enhancement</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          {/* Document Type Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                Document Category
              </label>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="w-full text-xs h-9 px-3 rounded-lg border border-gray-200 dark:border-navy-800 bg-white dark:bg-navy-950 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
              >
                {KYC_DOC_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                Custom Label (Optional)
              </label>
              <input
                type="text"
                value={customDocName}
                onChange={(e) => setCustomDocName(e.target.value)}
                placeholder={selectedDocType}
                className="w-full text-xs h-9 px-3 rounded-lg border border-gray-200 dark:border-navy-800 bg-white dark:bg-navy-950 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
              />
            </div>
          </div>

          {/* MAIN VIEWPORT: CAMERA OR REVIEW */}
          {!capturedRawDataUrl ? (
            /* Live Camera Viewfinder */
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                  />

                  {/* KYC Card Bounding Guide Overlay */}
                  <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                    <div className="flex justify-between items-start">
                      <div className="w-6 h-6 border-t-2 border-l-2 border-brand-orange rounded-tl"></div>
                      <span className="text-[11px] font-medium bg-black/60 text-white/90 px-2 py-0.5 rounded backdrop-blur-sm">
                        Align {selectedDocType}
                      </span>
                      <div className="w-6 h-6 border-t-2 border-r-2 border-brand-orange rounded-tr"></div>
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] text-white/80 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        Keep document flat under good light
                      </span>
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="w-6 h-6 border-b-2 border-l-2 border-brand-orange rounded-bl"></div>
                      <div className="w-6 h-6 border-b-2 border-r-2 border-brand-orange rounded-br"></div>
                    </div>
                  </div>

                  {/* Top-right In-Camera Controls (Flash, Flip) */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {torchAvailable && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                          torchOn ? 'bg-amber-400 text-black shadow-md' : 'bg-black/60 text-white hover:bg-black/80'
                        }`}
                        title={torchOn ? 'Turn Off Flash' : 'Turn On Flash'}
                      >
                        {torchOn ? <Zap size={16} /> : <ZapOff size={16} />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md transition-colors"
                      title="Switch Camera (Front/Back)"
                    >
                      <SwitchCamera size={16} />
                    </button>
                  </div>
                </>
              ) : cameraError ? (
                /* Camera Error State with File Upload Fallback */
                <div className="text-center p-6 max-w-sm space-y-3">
                  <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                    <AlertCircle size={26} />
                  </div>
                  <div className="text-sm font-medium text-white/90">Camera Unavailable</div>
                  <p className="text-xs text-white/60">{cameraError}</p>
                  <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => startCamera()}
                      className="text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
                    >
                      <RefreshCw size={13} className="mr-1.5" /> Retry Camera
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs bg-brand-orange text-white hover:bg-brand-orange/90"
                    >
                      <Upload size={13} className="mr-1.5" /> Upload Photo
                    </Button>
                  </div>
                </div>
              ) : (
                /* Connecting Spinner */
                <div className="flex flex-col items-center gap-2 text-white/70">
                  <RefreshCw size={24} className="animate-spin text-brand-orange" />
                  <span className="text-xs font-medium">Starting Camera...</span>
                </div>
              )}
            </div>
          ) : (
            /* Review & Clarity Enhancement View */
            <div className="space-y-3">
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-gray-950 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
                {processedDataUrl ? (
                  <img
                    src={processedDataUrl}
                    alt="Captured Document"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white/70">
                    <RefreshCw size={22} className="animate-spin text-brand-orange" />
                    <span className="text-xs">Applying Clarity Enhancement...</span>
                  </div>
                )}

                {/* Filter Badge indicator */}
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-mono text-white flex items-center gap-1.5">
                  <Sparkles size={12} className="text-brand-orange" />
                  <span className="capitalize">{filterMode} Enhanced</span>
                  {rotationDegrees > 0 && <span>• {rotationDegrees}°</span>}
                </div>

                {/* Rotate Quick Button */}
                <button
                  type="button"
                  onClick={handleRotate}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-md text-white transition-colors"
                  title="Rotate 90° Clockwise"
                >
                  <RotateCw size={16} />
                </button>
              </div>

              {/* Clarity Filter Toggles */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-navy-950 border border-gray-100 dark:border-navy-800">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Sliders size={13} className="text-brand-orange" />
                  Enhancement Mode:
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterMode('grayscale');
                      playFeedback('click');
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                      filterMode === 'grayscale'
                        ? 'bg-brand-orange text-white shadow-sm'
                        : 'bg-white dark:bg-navy-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 border border-gray-200 dark:border-navy-800'
                    }`}
                  >
                    Grayscale (Clarity)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterMode('bw');
                      playFeedback('click');
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                      filterMode === 'bw'
                        ? 'bg-brand-orange text-white shadow-sm'
                        : 'bg-white dark:bg-navy-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 border border-gray-200 dark:border-navy-800'
                    }`}
                  >
                    High Contrast B&W
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterMode('color');
                      playFeedback('click');
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                      filterMode === 'color'
                        ? 'bg-brand-orange text-white shadow-sm'
                        : 'bg-white dark:bg-navy-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 border border-gray-200 dark:border-navy-800'
                    }`}
                  >
                    Original Color
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hidden File Input for fallback */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-navy-800 bg-gray-50/50 dark:bg-navy-950/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          {!capturedRawDataUrl ? (
            /* Live Camera Footer Controls */
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <Upload size={14} className="mr-1.5" />
                Or Select from Gallery/File
              </Button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!cameraActive}
                  onClick={handleCapture}
                  className="h-10 px-6 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold rounded-xl shadow-md shadow-brand-orange/20 text-xs flex items-center gap-2"
                >
                  <Camera size={16} />
                  Capture & Process Document
                </Button>
              </div>
            </>
          ) : (
            /* Review Footer Controls */
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetake}
                className="text-xs text-gray-600 dark:text-gray-400"
              >
                <RefreshCw size={14} className="mr-1.5" />
                Retake Scan
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                  className="text-xs"
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  disabled={!processedDataUrl || isProcessing}
                  onClick={handleConfirm}
                  className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 text-xs flex items-center gap-2"
                >
                  <Check size={16} />
                  Attach Scanned Document
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
