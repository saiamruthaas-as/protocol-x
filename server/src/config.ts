import dotenv from 'dotenv';

// Load local .env if present
dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  corsOrigins: string[];
  groqApiKey?: string;
  groqModel: string;
}

export const config = {
  get port(): number {
    const p = parseInt(process.env.PORT || '3001', 10);
    return isNaN(p) ? 3001 : p;
  },
  get nodeEnv(): 'development' | 'production' | 'test' {
    return (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  },
  get corsOrigins(): string[] {
    const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173';
    const parsed = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);
    return parsed.length > 0 ? parsed : ['http://localhost:5173', 'http://127.0.0.1:5173'];
  },
  get groqApiKey(): string | undefined {
    const key = process.env.GROQ_API_KEY?.trim();
    return key && key !== 'gsk_your_groq_api_key_here' ? key : undefined;
  },
  get groqModel(): string {
    return process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';
  }
};

/**
 * Safe configuration inspection for health check & diagnostic output.
 * NEVER returns secrets or API keys.
 */
export function getSafeConfigSummary() {
  return {
    port: config.port,
    nodeEnv: config.nodeEnv,
    corsOrigins: config.corsOrigins,
    groqConfigured: Boolean(config.groqApiKey),
    groqModel: config.groqModel
  };
}
