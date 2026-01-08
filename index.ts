import express from 'express';
import { env } from '@/configs/env';
import cors from 'cors';
import monitorRoutes from '@/routes/monitor';
import incidentRoutes from '@/routes/incident';
import statusRoutes from '@/routes/status';
import workspacesRoutes from '@/routes/workspace';
import usersRoutes from '@/routes/user';
import subscriptionRoutes from '@/routes/subscription';
import logger from '@/utils/logger';
import { errorHandler } from '@/middlewares/error';
import { sendToQueue } from '@/services/queue';
import { startWorker } from '@/services/worker';
import { fetchAndLockDueMonitors } from '@/controllers/monitor';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '@/services/auth';
import { sendSuccessResponse } from '@/utils/responseHandler';

const app = express();
const PORT = env.PORT || 8000;

// Body Parser Middleware
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// CORS Configuration
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS']
  })
);

app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json({ limit: '10kb' })); // Body limit is 10kb
app.use('/api/v1/monitors', monitorRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/status', statusRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/workspaces', workspacesRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.get('/health', (_, response) => {
  sendSuccessResponse({
    response,
    message: 'API is running',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  });
});

async function schedulerLoop() {
  setInterval(async () => {
    try {
      const monitors = await fetchAndLockDueMonitors();

      if (monitors.length > 0) await sendToQueue(monitors);
    } catch (err) {
      console.error('Scheduler error', err);
    }
  }, 30_000);
}

(async () => {
  schedulerLoop();
  startWorker();
})();

// Global Error Handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${env.NODE_ENV} mode`);
});
