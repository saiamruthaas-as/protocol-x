/**
 * CatchUp AI — Frontend Typed API Client
 * Connects to the Express backend while maintaining full offline capability.
 */

export interface HealthResponseData {
  status: 'healthy' | 'degraded';
  version: string;
  uptime: number;
  timestamp: string;
  environment: string;
  services: {
    api: 'online';
    groqConfigured: boolean;
  };
}

export interface AiAnalyzeRequestBody {
  conversationId: string;
  text: string;
  options?: {
    model?: string;
    temperature?: number;
  };
}

export interface AiAnalyzeResponseData {
  conversationId: string;
  status: 'acknowledged' | 'completed';
  message: string;
  processedAt: string;
  modelUsed?: string;
  analysis?: {
    summary: string;
    keyPoints: string[];
    actionItems: Array<{
      task: string;
      assignee?: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    deadlines: Array<{
      deadline: string;
      context: string;
    }>;
    decisions: string[];
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

export class ApiClientError extends Error {
  public statusCode?: number;
  public code: string;
  public details?: Record<string, string>;

  constructor(code: string, message: string, statusCode?: number, details?: Record<string, string>) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class CatchUpApiClient {
  private baseUrl: string;

  constructor(customBaseUrl?: string) {
    const envBaseUrl = typeof import.meta !== 'undefined'
      ? (import.meta as { env?: { VITE_API_BASE_URL?: string } })?.env?.VITE_API_BASE_URL
      : undefined;
    this.baseUrl = (customBaseUrl || envBaseUrl || 'http://localhost:3001/api/v1').replace(/\/$/, '');
  }

  /**
   * Helper to perform fetch requests with timeout and error handling
   */
  private async fetchWithTimeout<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = 4000
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // If caller provided an external AbortSignal, link it
    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', () => controller.abort());
      }
    }

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...(options.headers || {})
        }
      });

      let json: ApiResponse<T>;
      try {
        json = await response.json();
      } catch {
        throw new ApiClientError(
          'INVALID_JSON_RESPONSE',
          `Server returned a non-JSON response with HTTP status ${response.status}.`,
          response.status
        );
      }

      if (!response.ok || !json.success) {
        throw new ApiClientError(
          json.error?.code || `HTTP_${response.status}`,
          json.error?.message || `Request failed with HTTP ${response.status}`,
          response.status,
          json.error?.details
        );
      }

      if (json.data === undefined) {
        throw new ApiClientError(
          'MISSING_DATA_PAYLOAD',
          'Server returned success: true but missing data payload.',
          response.status
        );
      }

      return json.data;
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        throw err;
      }

      const isAbort = (err instanceof Error && err.name === 'AbortError') ||
        (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError');

      if (isAbort) {
        throw new ApiClientError(
          'REQUEST_TIMEOUT',
          `Backend request timed out after ${timeoutMs}ms or was aborted.`
        );
      }

      const msg = err instanceof Error ? err.message : String(err);
      throw new ApiClientError(
        'BACKEND_UNAVAILABLE',
        `Unable to connect to CatchUp AI backend at ${this.baseUrl}. The server may be offline. (${msg})`
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check backend health and readiness
   */
  public async checkHealth(timeoutMs: number = 3000): Promise<HealthResponseData> {
    return this.fetchWithTimeout<HealthResponseData>('/health', { method: 'GET' }, timeoutMs);
  }

  /**
   * Perform quick availability check returning boolean without throwing
   */
  public async isAvailable(timeoutMs: number = 2500): Promise<boolean> {
    try {
      const health = await this.checkHealth(timeoutMs);
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Submit conversation for AI analysis (with cancellation support)
   */
  public async requestAiAnalysis(
    payload: AiAnalyzeRequestBody,
    signal?: AbortSignal,
    timeoutMs: number = 10000
  ): Promise<AiAnalyzeResponseData> {
    return this.fetchWithTimeout<AiAnalyzeResponseData>(
      '/ai/analyze',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal
      },
      timeoutMs
    );
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Singleton client export
export const apiClient = new CatchUpApiClient();
