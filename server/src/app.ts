import express, { Express, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import { config } from './config';
import { healthRouter } from './routes/health';
import { aiRouter } from './routes/ai';
import { errorHandler, ApiHttpError } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();

  // Basic security response headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Restrictive CORS configuration
  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., server-to-server, curl, tests)
      if (!origin) {
        return callback(null, true);
      }

      if (config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new ApiHttpError(403, 'CORS_FORBIDDEN', `Origin '${origin}' not allowed by CORS policy.`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
  };

  app.use(cors(corsOptions));

  // Request payload size boundary (1 MB)
  app.use(express.json({ limit: '1mb' }));

  // Versioned API routes
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/ai', aiRouter);

  // Catch-all 404 handler for unknown routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new ApiHttpError(404, 'NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
