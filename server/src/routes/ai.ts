import { Router, Request, Response, NextFunction } from 'express';
import { ApiResponse, AiAnalyzeRequestBody, AiAnalyzeResponseData } from '../types/api';
import { validateJsonContentType, validateAiAnalyzeRequest } from '../middleware/validateRequest';
import { createRateLimiter } from '../middleware/rateLimiter';
import { ApiHttpError } from '../middleware/errorHandler';
import { config } from '../config';
import { analyzeWithGroq } from '../services/groqService';

const router = Router();

// Rate limiter for AI analysis endpoints (30 requests per 15 minutes per IP)
const aiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'AI request limit reached for this IP. Please wait before requesting further analysis.'
});

/**
 * POST /api/v1/ai/analyze
 * Generates conversation intelligence analysis using Groq LLM
 */
router.post(
  '/analyze',
  aiRateLimiter,
  validateJsonContentType,
  validateAiAnalyzeRequest,
  async (req: Request, res: Response<ApiResponse<AiAnalyzeResponseData>>, next: NextFunction) => {
    try {
      const { conversationId, text, options } = req.body as AiAnalyzeRequestBody;

      // Verify Groq configuration status
      if (!config.groqApiKey) {
        throw new ApiHttpError(
          503,
          'AI_SERVICE_UNCONFIGURED',
          'Groq AI service is not configured on this server. The application must use the browser-local rule-based engine.'
        );
      }

      // If dry run requested (e.g. for connection validation without consuming LLM tokens)
      if ((options as { dryRun?: boolean })?.dryRun) {
        const responseData: AiAnalyzeResponseData = {
          conversationId,
          status: 'acknowledged',
          message: 'Request validated and accepted by CatchUp AI backend. AI pipeline is ready.',
          processedAt: new Date().toISOString(),
          modelUsed: options?.model || config.groqModel
        };
        res.status(200).json({ success: true, data: responseData });
        return;
      }

      // Invoke Groq LLM inference
      const analysisResult = await analyzeWithGroq(conversationId, text, options?.model);

      res.status(200).json({
        success: true,
        data: analysisResult
      });
    } catch (err) {
      next(err);
    }
  }
);

export const aiRouter = router;
