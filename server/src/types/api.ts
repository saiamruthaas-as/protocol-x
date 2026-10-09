/**
 * CatchUp AI — Server API Typed Contracts
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

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
