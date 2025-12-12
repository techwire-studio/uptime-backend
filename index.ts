import express from 'express';
import { env } from '@/configs/env';
import cors from 'cors';
import monitorRoutes from '@/routes/monitor';
import incidentRoutes from '@/routes/incident';
import statusRoutes from '@/routes/status';
import logger from '@/utils/logger';
import { errorHandler } from '@/middlewares/error';
import { sendToQueue } from '@/services/queue';
import { startWorker } from '@/services/worker';
import { getDueMonitors } from '@/controllers/monitor';

const app = express();
const PORT = env.PORT || 8000;

// Body Parser Middleware
app.use(express.json({ limit: '10kb' })); // Body limit is 10kb
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// CORS Configuration
app.use(
  cors({
    origin: env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'device-remember-token',
      'Access-Control-Allow-Origin',
      'Origin',
      'Accept'
    ]
  })
);

app.use('/api/v1/monitors', monitorRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/status', statusRoutes);

async function schedulerLoop() {
  setInterval(async () => {
    const monitors = await getDueMonitors();
    if (monitors.length > 0) {
      await sendToQueue(monitors);
    }
  }, 5000); // run every 5 seconds
}

// (async () => {
//   schedulerLoop();
//   startWorker();
// })();

// Global Error Handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${env.NODE_ENV} mode`);
});
