import { toast } from 'sonner';

export class ApiError extends Error {
  status: number;
  url?: string;
  constructor(message: string, status: number, url?: string) {
    super(message);
    this.status = status;
    this.url = url;
  }
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    
    const urlStr = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
    const isInternal = urlStr.startsWith('/api/') || urlStr.includes(window.location.origin + '/api/');
    
    if (isInternal) {
      const token = localStorage.getItem('dc_token');
      if (token) {
        init = init || {};
        init.headers = init.headers || {};
        if (init.headers instanceof Headers) {
          init.headers.set('x-dc-token', token);
        } else if (Array.isArray(init.headers)) {
          init.headers.push(['x-dc-token', token]);
        } else {
          (init.headers as any)['x-dc-token'] = token;
        }
      }
    }
    
    const response = await fetch(input, init);
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());

    if (url.includes('/api/dc/')) {
      const clonedResponse = response.clone();
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.statusText}`;
        try {
          const data = await clonedResponse.json();
          if (data.error) {
            errorMessage = data.error;
          }
        } catch (e) {
          // Fallback to generic message
        }
        toast.error(errorMessage);
        throw new ApiError(errorMessage, response.status, url);
      } else {
        // Handle 200 OK with { ok: false, error: "..." }
        try {
          const data = await clonedResponse.json();
          if (data && data.ok === false && data.error) {
            toast.error(data.error);
            // We don't throw here to not break existing code that checks result.ok
          }
        } catch (e) {
          // Ignore json parse errors for ok responses
        }
      }
    }
    
    return response;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
    if (url.includes('/api/dc/')) {
      toast.error('Network Error: Unable to connect to the server. Please check your connection.');
    }
    throw error;
  }
}
