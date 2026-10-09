import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/api';

export class ApiHttpError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, string>;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, string>) {
    super(message);
    this.name = 'ApiHttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Central Error Handler Middleware
 * Guarantees that stack traces, system paths, environment variables, or keys
 * are NEVER returned in API responses to the browser.
 */
export function errorHandler(
  err: Error | ApiHttpError,
  req: Request,
  res: Response<ApiResponse>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Handle payload too large from express.json({ limit: ... })
  if ('type' in err && (err as { type: string }).type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload exceeds the maximum permitted limit of 1 MB.'
      }
    });
    return;
  }

  // Handle malformed JSON body from express.json()
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400 && 'body' in err) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MALFORMED_JSON',
        message: 'The request body could not be parsed as valid JSON.'
      }
    });
    return;
  }

  // Handle application ApiHttpError
  if (err instanceof ApiHttpError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
    return;
  }

  // Handle generic / unhandled errors safely (never leak stack trace)
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred. Please try again later.'
    }
  });
}
