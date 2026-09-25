import { apiFetch } from '@/lib/api';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ServerCrash, WifiOff, ShieldAlert, Clock, Hourglass, Bot, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './button';
import { ApiError } from '@/lib/api';
import { ai } from '@/lib/gemini';
import { cn } from '@/lib/utils';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  aiAnalysis: string | null;
  isAnalyzing: boolean;
  retryCount: number;
  isAutoRetrying: boolean;
  countdown: number;
  isNeutralized: boolean;
  recoveryKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimer: NodeJS.Timeout | null = null;
  private countdownInterval: NodeJS.Timeout | null = null;
  private lastErrorTime: number = 0;
  private errorMap: Record<string, { count: number, timestamp: number }> = {};
  private retryAttemptCount: number = 0;

  public state: State = {
    hasError: false,
    error: null,
    aiAnalysis: null,
    isAnalyzing: false,
    retryCount: 0,
    isAutoRetrying: false,
    countdown: 0,
    isNeutralized: false,
    recoveryKey: 0
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, aiAnalysis: null, isAnalyzing: false, retryCount: 0, isAutoRetrying: false, countdown: 0, isNeutralized: false, recoveryKey: 0 };
  }

  checkDuplicateError = (error: Error): boolean => {
    const errorKey = error.message || 'unknown_error';
    const now = Date.now();
    const record = this.errorMap[errorKey];
    
    if (record && now - record.timestamp < 60000) {
      record.count += 1;
      record.timestamp = now;
    } else {
      this.errorMap[errorKey] = { count: 1, timestamp: now };
    }
    
    if (this.errorMap[errorKey].count > 3) {
       this.notifyMD(errorKey);
       return true;
    }
    return false;
  }

  notifyMD = (errorInfo: string) => {
    console.warn(`[AUDIT] Duplicate function crash detected. Neutralizing and notifying MD. Error: ${errorInfo}`);
    apiFetch('/api/dc/report-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'DUPLICATE_CRASH_LOOP',
        message: 'A function is repeatedly crashing and has been auto-neutralized by the audit system.',
        error: errorInfo,
        notify: 'upendra.raghav@divyanshicapital.com'
      })
    }).catch(() => {});
  }

  handleIncomingError = (error: Error, errorInfo?: ErrorInfo) => {
    const isWebSocketError = error?.message?.includes('WebSocket') || error?.message?.toLowerCase().includes('handshake');
    
    if (isWebSocketError) {
      console.warn('Ignored benign WebSocket error:', error.message);
      return;
    }

    // Show a real-time toast to the user
    toast.error(`Error: ${error.message || 'Unknown error occurred'}`, {
      description: 'The system has logged this failure and is attempting recovery.',
      duration: 5000,
    });

    if (this.checkDuplicateError(error)) {
       this.setState({ isNeutralized: true, hasError: true, error, isAutoRetrying: false });
       this.clearTimers();
       return;
    }

    // Automatic recovery for 401 Unauthorized
    if ((error instanceof ApiError && error.status === 401) || error?.message?.includes('401')) {
      localStorage.removeItem('dc_session');
      localStorage.removeItem('dc_token');
      this.setState({ isNeutralized: true, hasError: false, error: null });
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
      return;
    }

    const isConnectionError = 
      error instanceof ApiError || 
      (error && error.message && (
        error.message.includes('Server error') || 
        error.message.includes('Network Error') || 
        error.message.includes('Failed to fetch') || 
        error.message.includes('timeout') || 
        error.message.includes('Timeout') || 
        error.message.includes('undici') || 
        error.message.includes('network') ||
        error.message.includes('NetworkError') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('403') ||
        error.message.includes('401')
      ));

    if (isConnectionError) {
      const now = Date.now();
      
      // Reset retry count if it's been more than 60 seconds since the last error
      if (now - this.lastErrorTime > 60000) {
        this.retryAttemptCount = 0;
      }
      this.lastErrorTime = now;

      if (this.retryAttemptCount < 3) {
        this.retryAttemptCount += 1;
        // Exponential backoff: 2s, 4s, 8s
        const delaySeconds = Math.pow(2, this.retryAttemptCount);
        
        this.setState({ 
          hasError: true, 
          error, 
          aiAnalysis: null, 
          isAnalyzing: false,
          retryCount: this.retryAttemptCount,
          isAutoRetrying: true,
          countdown: delaySeconds
        });

        this.clearTimers();
        
        this.countdownInterval = setInterval(() => {
          this.setState(prev => {
            if (prev.countdown <= 1) {
              if (this.countdownInterval) clearInterval(this.countdownInterval);
              return { countdown: 0 };
            }
            return { countdown: prev.countdown - 1 };
          });
        }, 1000);

        this.retryTimer = setTimeout(() => {
          this.setState({ 
            hasError: false, 
            error: null, 
            isAutoRetrying: false 
          });
        }, delaySeconds * 1000);
        
        return;
      } else {
        // Exceeded 3 attempts! Notify MD and show finalized error screen.
        this.notifyMD(`Server connection failed permanently after 3 retries: ${error.message || 'Unknown network error'}`);
        this.setState({ 
          hasError: true, 
          error, 
          aiAnalysis: null, 
          isAnalyzing: false, 
          isAutoRetrying: false,
          retryCount: this.retryAttemptCount
        });
        this.runAiDiagnostics(error, errorInfo);
        return;
      }
    }

    // Non-connection error: render the error screen normally without auto-retry, but run diagnostics
    this.setState({ hasError: true, error, aiAnalysis: null, isAnalyzing: false, isAutoRetrying: false, retryCount: this.retryAttemptCount });
    this.runAiDiagnostics(error, errorInfo);
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.handleIncomingError(error, errorInfo);
  }

  customErrorHandler = (event: Event) => {
    const customEvent = event as CustomEvent;
    const { error, errorInfo } = customEvent.detail || {};
    if (error) {
      this.handleIncomingError(error, errorInfo);
    }
  }

  backendConnectionHandler = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail === 'disconnected') {
      toast.error('Global Recovery Initiated', {
        description: 'Attempting to re-initialize core application state due to silent failure...',
        duration: 5000,
      });
      // Increment recoveryKey to force unmount/remount of the children
      this.setState(prev => ({ recoveryKey: prev.recoveryKey + 1, hasError: false, error: null, isAutoRetrying: false }));
    }
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.promiseRejectionHandler);
    window.addEventListener('dc-custom-error', this.customErrorHandler);
    window.addEventListener('backend-connection', this.backendConnectionHandler);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.promiseRejectionHandler);
    window.removeEventListener('dc-custom-error', this.customErrorHandler);
    window.removeEventListener('backend-connection', this.backendConnectionHandler);
    this.clearTimers();
  }

  clearTimers = () => {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  promiseRejectionHandler = (event: PromiseRejectionEvent) => {
    const error = event.reason;
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.handleIncomingError(errorObj);
  }

  runAiDiagnostics = async (error: Error, errorInfo?: ErrorInfo) => {
    this.setState({ isAnalyzing: true, aiAnalysis: null });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [{ role: "user", parts: [{ text: `An error occurred in the application. Provide a brief, highly technical root cause analysis and a suggested fix in 2-3 sentences. Do not use markdown wrappers. 
        
Error Message: ${error.message}
Stack Trace: ${error.stack || 'N/A'}
Component Stack: ${errorInfo?.componentStack || 'N/A'}` }] }],
        config: { systemInstruction: "You are an expert self-healing AI debugger built directly into this app's error boundary." }
      });
      this.setState({ aiAnalysis: response.text });
    } catch (e) {
      this.setState({ aiAnalysis: "AI Diagnostics failed to connect to the analysis engine." });
    } finally {
      this.setState({ isAnalyzing: false });
    }
  }

  public render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const isNeutralized = this.state.isNeutralized;
      const isWebSocketError = error?.message?.includes('WebSocket') || error?.message?.toLowerCase().includes('handshake');
      const isTokenMismatch = error?.message?.toLowerCase().includes('token mismatch') || error?.message?.includes('DC_INTERNAL_TOKEN') || error?.message?.includes('MALLIK_API_KEY');
      const isApiError = error instanceof ApiError || (error?.message && error.message.includes('Server error'));
      const isNetworkError = error?.message?.includes('Network Error') || error?.message?.includes('Failed to fetch');
      const isTimeout = (error instanceof ApiError && (error.status === 504 || error.status === 408)) || error?.message?.includes('timeout') || error?.message?.includes('Timeout');
      const isUnauthorized = (error instanceof ApiError && (error.status === 401 || error.status === 403)) || error?.message?.includes('unauthorized') || error?.message?.includes('Forbidden');
      const isRateLimited = error instanceof ApiError && error.status === 429;
      const isServiceUnavailable = error instanceof ApiError && error.status === 503;
      const isAutoRetrying = this.state.isAutoRetrying;
      const countdown = this.state.countdown;

      let title = 'Something went wrong';
      let Icon = AlertTriangle;
      
      if (isNeutralized) {
        title = 'System Feature Auto-Neutralized';
        Icon = ShieldAlert;
      } else if (isTokenMismatch) {
        title = 'Authentication Token Mismatch';
        Icon = ShieldAlert;
      } else if (isWebSocketError) {
        title = 'WebSocket Handshake Failure';
        Icon = WifiOff;
      } else if (isUnauthorized) {
        title = 'Unauthorized Access';
        Icon = ShieldAlert;
      } else if (isRateLimited) {
        title = 'Rate Limit Exceeded';
        Icon = Hourglass;
      } else if (isServiceUnavailable) {
        title = 'Service Unavailable';
        Icon = ServerCrash;
      } else if (isTimeout) {
        title = 'Connection Timeout';
        Icon = Clock;
      } else if (isNetworkError) {
        title = 'Network Connection Lost';
        Icon = WifiOff;
      } else if (isApiError) {
        title = 'Server Connectivity Error';
        Icon = ServerCrash;
      }

      return (
        <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-4">
          <div className="max-w-xl w-full bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              {isAutoRetrying ? (
                <RefreshCw className="text-orange-500 animate-spin" size={32} />
              ) : (
                <Icon className="text-red-500" size={32} />
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-white mb-2">
                {isNeutralized ? 'Function Neutralized (Audit Active)' : isAutoRetrying ? 'Connection Interrupted' : title}
              </h2>
              
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                {isNeutralized
                  ? `AUDIT SYSTEM: A repetitive crash loop has been detected in this feature. To protect system stability, this function has been auto-neutralized. The MD has been securely notified.`
                  : isAutoRetrying 
                  ? `We detected a transient network drop (503 Service Unavailable). The system will automatically retry the request to gracefully recover.` 
                  : (error?.message || 'An unexpected error occurred while communicating with the backend API.')}
              </p>
              
              {isAutoRetrying && !isNeutralized && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mt-4">
                  <div className="flex items-center justify-center gap-2 text-orange-400 font-mono text-sm font-bold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Auto-Retrying in {countdown}s (Attempt {this.state.retryCount}/3)</span>
                  </div>
                </div>
              )}
              
              {!isAutoRetrying && !isNeutralized && isApiError && error instanceof ApiError && error.status && (
                <div className="mt-4 flex flex-col gap-2 items-center">
                  <div className="inline-flex items-center justify-center gap-2 bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-mono font-bold">
                    <span>API_STATUS:</span>
                    <span>{error.status}</span>
                  </div>
                                    <div className="mt-4 text-left bg-red-950/30 p-4 rounded-xl border border-red-500/20 w-full">
                    <p className="text-sm font-semibold text-red-400 mb-2">Actionable Troubleshooting Steps:</p>
                    <ul className="text-sm text-red-300/80 list-disc pl-5 space-y-1">
                      {(error.status === 401 || error.status === 403) && (
                        <>
                          <li>Click the <strong>Login</strong> button below to re-authenticate.</li>
                          <li>Verify that your account has the correct permissions for this action.</li>
                          <li>Clear your browser cache if the issue persists.</li>
                        </>
                      )}
                      {error.status === 429 && (
                        <>
                          <li>Wait for 60 seconds before making another request.</li>
                          <li>Check if any automated scripts are running in the background.</li>
                          <li>Contact support if you need a higher rate limit.</li>
                        </>
                      )}
                      {error.status === 503 && (
                        <>
                          <li>The backend system is currently undergoing maintenance or experiencing high load.</li>
                          <li>Click <strong>Retry</strong> to manually reload the current component and try again.</li>
                          <li>If the problem persists, contact your IT administrator.</li>
                        </>
                      )}
                      {error.status === 504 && (
                        <>
                          <li>Check your internet connection stability.</li>
                          <li>Click <strong>Retry</strong> to retry the request.</li>
                          <li>If you are on a VPN, try disconnecting and reconnecting.</li>
                        </>
                      )}
                      {error.status !== 401 && error.status !== 403 && error.status !== 429 && error.status !== 503 && error.status !== 504 && (
                        <>
                          <li>Click <strong>Retry</strong> to refresh the page.</li>
                          <li>If the issue continues, contact technical support with the error code shown above.</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* AI Diagnostics Panel */}
            {!isAutoRetrying && !isNeutralized && (
              <div className="bg-navy-900/50 border border-blue-500/20 rounded-2xl p-4 text-left mt-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5" />
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-blue-100 uppercase tracking-widest font-mono">10x AI Auto-Diagnostics</h3>
                </div>
                
                <div className="relative z-10 min-h-[60px] flex items-center">
                  {this.state.isAnalyzing ? (
                     <div className="flex items-center gap-3 text-blue-400/70 text-sm">
                       <Loader2 className="w-4 h-4 animate-spin" />
                       Analyzing crash telemetry and formulating a patch...
                     </div>
                  ) : (
                     <p className="text-sm text-gray-300 leading-relaxed font-mono">
                       {this.state.aiAnalysis || "No diagnostic data available."}
                     </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4 pt-4 w-full">
              {!isNeutralized && (
                <Button 
                  onClick={() => {
                    this.clearTimers();
                    this.retryAttemptCount = 0;
                    this.setState({ hasError: false, error: null, aiAnalysis: null, isAnalyzing: false, isAutoRetrying: false, retryCount: 0 });
                  }}
                  className="w-full h-12 bg-white text-navy-950 hover:bg-gray-200 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} className={isAutoRetrying ? "animate-spin" : ""} />
                  {isAutoRetrying ? 'Retrying Connection...' : 'Retry Connection Now'}
                </Button>
              )}
              
              {isUnauthorized && !isNeutralized && (
                <Button 
                  onClick={() => {
                    localStorage.removeItem('dc_session');
                    window.location.href = '/';
                  }}
                  className="w-full h-12 bg-red-500 text-white hover:bg-red-600 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <ShieldAlert size={18} />
                  Login Again
                </Button>
              )}
              
              {/* MD Direct Contact Hub */}
              {(isNeutralized || (!isAutoRetrying && (this.state.retryCount >= 3 || isRateLimited || isServiceUnavailable || isNetworkError || isApiError))) && (
                <div className="border-t border-white/10 pt-4 mt-2 space-y-3">
                  <p className="text-xs text-gray-400 font-medium">Permanent Failure: The MD has been auto-notified. You may also contact support directly:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                    <a 
                      href="mailto:upendra.raghav@divyanshicapital.com?subject=System%20Connection%20Failed&body=Error%20Details:%20Permanent%20connection%20failure%20after%203%20attempts."
                      className="h-10 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-500/20 transition-all"
                    >
                      <ShieldAlert size={14} />
                      Email MD
                    </a>
                    <a 
                      href="https://t.me/divyanshicapital" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="h-10 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-sky-500/20 transition-all"
                    >
                      <RefreshCw size={14} className="rotate-45" />
                      Telegram
                    </a>
                    <a 
                      href="https://wa.me/917838074351" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="h-10 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/20 transition-all"
                    >
                      <AlertTriangle size={14} />
                      WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return <React.Fragment key={this.state.recoveryKey}>{this.props.children}</React.Fragment>;
  }
}
