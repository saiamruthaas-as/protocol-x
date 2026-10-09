import { Request, Response, NextFunction } from 'express';
import { ApiHttpError } from './errorHandler';
import { AiAnalyzeRequestBody } from '../types/api';

/**
 * Ensures POST/PUT/PATCH requests specify application/json
 */
export function validateJsonContentType(req: Request, res: Response, next: NextFunction): void {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.toLowerCase().includes('application/json')) {
      return next(
        new ApiHttpError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Content-Type must be application/json.'
        )
      );
    }
  }
  next();
}

/**
 * Validates request body for POST /api/v1/ai/analyze
 */
export function validateAiAnalyzeRequest(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as Partial<AiAnalyzeRequestBody>;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return next(new ApiHttpError(400, 'INVALID_REQUEST_BODY', 'Request body must be a valid JSON object.'));
  }

  // Reject unexpected top-level keys
  const allowedKeys = new Set(['conversationId', 'text', 'options']);
  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      return next(
        new ApiHttpError(
          400,
          'DISALLOWED_FIELD',
          `Disallowed field '${key}' in request payload.`
        )
      );
    }
  }

  // conversationId validation
  if (!body.conversationId || typeof body.conversationId !== 'string') {
    return next(
      new ApiHttpError(
        400,
        'INVALID_CONVERSATION_ID',
        'Field conversationId is required and must be a string.'
      )
    );
  }

  if (body.conversationId.length > 100) {
    return next(
      new ApiHttpError(
        400,
        'CONVERSATION_ID_TOO_LONG',
        'conversationId must not exceed 100 characters.'
      )
    );
  }

  // text validation
  if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
    return next(
      new ApiHttpError(
        400,
        'INVALID_TEXT_PAYLOAD',
        'Field text is required and must be a non-empty string.'
      )
    );
  }

  if (body.text.length > 500_000) {
    return next(
      new ApiHttpError(
        400,
        'TEXT_PAYLOAD_TOO_LARGE',
        'Conversation text payload exceeds the 500,000 character analysis boundary.'
      )
    );
  }

  // options validation (optional)
  if (body.options !== undefined) {
    if (typeof body.options !== 'object' || body.options === null || Array.isArray(body.options)) {
      return next(
        new ApiHttpError(
          400,
          'INVALID_OPTIONS',
          'Field options must be an object if provided.'
        )
      );
    }

    if (body.options.temperature !== undefined) {
      if (typeof body.options.temperature !== 'number' || body.options.temperature < 0 || body.options.temperature > 2) {
        return next(
          new ApiHttpError(
            400,
            'INVALID_TEMPERATURE',
            'options.temperature must be a number between 0.0 and 2.0.'
          )
        );
      }
    }

    if (body.options.model !== undefined && typeof body.options.model !== 'string') {
      return next(
        new ApiHttpError(
          400,
          'INVALID_MODEL',
          'options.model must be a string.'
        )
      );
    }
  }

  next();
}
