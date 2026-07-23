import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ApiError } from '@/lib/api';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  redirecting: boolean;
}

export class TokenBoundErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    redirecting: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, redirecting: false };
  }

  private handlePersonalFileAuthError(error: Error) {
    const isPersonalFileApiError = 
      error instanceof ApiError && 
      (error.status === 401 || error.status === 403) && 
      (error.url?.includes('personal-file') || error.message?.includes('personal-file') || error.message?.includes('DRIVE-FILE') || error.message?.includes('ID Mismatch'));

    const isGeneralIdMismatch = 
      error.message?.includes('ID Mismatch') || 
      error.message?.includes('Session Expired: ID Mismatch') ||
      (error instanceof ApiError && (error.status === 401 || error.status === 403) && error.url?.includes('personal-file'));

    if (isPersonalFileApiError || isGeneralIdMismatch) {
      console.warn("[SECURITY AUDIT] Personal File ID Mismatch or Unauthorized detected. Redirecting with Security Block.");
      
      this.setState({ redirecting: true });
      
      // Clear user session to prevent unauthorized access
      localStorage.removeItem('dc_session');
      localStorage.removeItem('dc_token');
      localStorage.setItem('dc_login_error', 'Session Expired: ID Mismatch');
      
      // Redirect to login page
      setTimeout(() => {
        window.location.href = '/?error=session_expired_id_mismatch';
      }, 1000);
      
      return true;
    }
    return false;
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[TokenBoundErrorBoundary] Caught error:', error, errorInfo);
    this.handlePersonalFileAuthError(error);
  }

  private customErrorHandler = (event: Event) => {
    const customEvent = event as CustomEvent;
    const { error } = customEvent.detail || {};
    if (error) {
      this.handlePersonalFileAuthError(error);
    }
  }

  componentDidMount() {
    window.addEventListener('dc-custom-error', this.customErrorHandler);
  }

  componentWillUnmount() {
    window.removeEventListener('dc-custom-error', this.customErrorHandler);
  }

  public render() {
    if (this.state.redirecting) {
      return (
        <div className="p-8 bg-red-950/20 border border-red-500/20 rounded-2xl text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="text-red-500 animate-pulse" size={24} />
          </div>
          <h3 className="text-lg font-bold text-white font-mono">Session Expired</h3>
          <p className="text-sm text-gray-400">ID Mismatch detected on Personal File security verification. Redirecting to Enterprise Login portal...</p>
          <div className="flex justify-center">
            <Loader2 className="animate-spin text-brand-orange w-5 h-5" />
          </div>
        </div>
      );
    }

    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-mono">
          Component Error: {this.state.error?.message || 'Failed to render segment.'}
        </div>
      );
    }

    return this.props.children;
  }
}
