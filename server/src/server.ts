import { createApp } from './app';
import { config, getSafeConfigSummary } from './config';

const app = createApp();

const server = app.listen(config.port, () => {
  const summary = getSafeConfigSummary();
  console.log(`=======================================================`);
  console.log(` CatchUp AI Backend Server v1.0.0 Online`);
  console.log(` Port: ${summary.port} | Mode: ${summary.nodeEnv}`);
  console.log(` Allowed Origins: ${summary.corsOrigins.join(', ')}`);
  console.log(` Groq AI Configured: ${summary.groqConfigured ? 'YES (Model: ' + summary.groqModel + ')' : 'NO (Local-only mode)'}`);
  console.log(` Health endpoint: http://localhost:${summary.port}/api/v1/health`);
  console.log(`=======================================================`);
});

// Graceful shutdown handling
function handleShutdown(signal: string) {
  console.log(`Received ${signal}. Gracefully closing CatchUp AI HTTP server...`);
  server.close(() => {
    console.log('HTTP server closed cleanly.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export { server, app };
