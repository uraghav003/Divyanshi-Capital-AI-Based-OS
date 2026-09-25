/**
 * Robust WebSocket Connection Retry & Guard Service
 * 
 * Manages connection states and hides benign console errors when connections drop,
 * such as Vite's HMR "WebSocket closed without opened" errors.
 * Also handles device sleep/wake cycles and automatic state recovery.
 */

export function initializeWebSocketGuard() {
  if (typeof window === 'undefined') return;

  // Recovery logic for when a drop or wake event occurs
  const attemptRecovery = () => {
    // If we are on the Calling screen, hard refresh is usually safest to restore WebRTC/telephony state
    const callingIframe = document.querySelector('iframe[src*="page=calling"]');
    if (callingIframe) {
      console.log('[WebSocketGuard] Detected Calling screen during recovery. Hard refreshing...');
      window.location.reload();
      return;
    }
    
    // Otherwise, dispatch an event so React components can re-sync if needed
    window.dispatchEvent(new CustomEvent('backend-connection-recover'));
  };

  // Handle device wake-up (returning from sleep)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('[WebSocketGuard] Device wake or tab focus detected. Checking connections...');
      // Small delay to let network stack initialize
      setTimeout(attemptRecovery, 1000);
    }
  });

  window.addEventListener('online', () => {
    console.log('[WebSocketGuard] Network online detected.');
    setTimeout(attemptRecovery, 1000);
  });

  // 1. Guard against Unhandled Rejections for benign WebSocket closures
  window.addEventListener('unhandledrejection', (event) => {
    const errorMsg = typeof event.reason === 'string' ? event.reason : event.reason?.message;
    
    if (errorMsg && (
      errorMsg.includes('WebSocket closed without opened') || 
      errorMsg.includes('failed to connect to websocket')
    )) {
      event.preventDefault(); // Prevents the error overlay and console log
      console.debug('[WebSocketGuard] Suppressed benign WebSocket rejection.');
    }
  });

  // 2. Guard against Console Errors for benign WebSocket connection drops
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    if (args.length > 0 && typeof args[0] === 'string') {
      const msg = args[0];
      if (
        msg.includes('WebSocket closed without opened') ||
        msg.includes('[vite] failed to connect to websocket') ||
        msg.includes('WebSocket connection to') // generic browser WS connection error
      ) {
        console.debug('[WebSocketGuard] Suppressed benign WebSocket console error.');
        // If a real WebSocket connection error happens, we might want to recover, but Vite's HMR drops are frequent.
        // We will rely on our app-level ping or visibility change for major recovery.
        return;
      }
    }
    
    // Check if args contain error objects with these messages
    for (const arg of args) {
      if (arg instanceof Error && arg.message.includes('WebSocket closed without opened')) {
         console.debug('[WebSocketGuard] Suppressed benign WebSocket console error.');
         return;
      }
    }

    originalConsoleError.apply(console, args);
  };

  // 3. Graceful WebSocket Close Override to prevent connection state race conditions
  const originalClose = window.WebSocket.prototype.close;
  window.WebSocket.prototype.close = function (code?: number, reason?: string) {
    if (this.readyState === window.WebSocket.CONNECTING) {
      // If still connecting, wait until open to close gracefully to avoid throwing
      this.addEventListener('open', () => {
        try {
          originalClose.call(this, code, reason);
        } catch (e) {
          // Suppress error
        }
      }, { once: true });
      return;
    }
    
    try {
      originalClose.call(this, code, reason);
    } catch (e) {
      // Suppress error
    }
  };
}
