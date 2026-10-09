import { Router, Request, Response } from 'express';
import { ApiResponse, HealthResponseData } from '../types/api';
import { config } from '../config';

const router = Router();

/**
 * GET /api/v1/health
 * Public health check endpoint
 */
router.get('/', (req: Request, res: Response<ApiResponse<HealthResponseData>>) => {
  const healthData: HealthResponseData = {
    status: 'healthy',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    services: {
      api: 'online',
      groqConfigured: Boolean(config.groqApiKey)
    }
  };

  res.status(200).json({
    success: true,
    data: healthData
  });
});

export const healthRouter = router;
