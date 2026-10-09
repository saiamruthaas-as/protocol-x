import { Request, Response, NextFunction } from 'express';
import { ApiHttpError } from './errorHandler';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

/**
 * Lightweight, zero-dependency in-memory rate limiter per IP address
 */
export function createRateLimiter(options: RateLimitOptions) {
  const store = new Map<string, RateLimitRecord>();

  // Periodically clean expired records every 60 seconds
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of store.entries()) {
      if (now > value.resetAt) {
        store.delete(key);
      }
    }
  }, 60_000);

  // Allow Node process to exit cleanly without keeping interval alive
  if (interval.unref) {
    interval.unref();
  }

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let record = store.get(ip);
    if (!record || now > record.resetAt) {
      record = {
        count: 1,
        resetAt: now + options.windowMs
      };
      store.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, options.max - record.count);
    const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', options.max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetSeconds.toString());

    if (record.count > options.max) {
      return next(
        new ApiHttpError(
          429,
          'RATE_LIMIT_EXCEEDED',
          options.message || 'Too many requests. Please wait before making further requests.'
        )
      );
    }

    next();
  };
}
