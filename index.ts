import express from 'express';
import { env } from '@configs/env.config';
import cors from 'cors';
import logger from '@/utils/logger';

const app = express();
const PORT = env.PORT || 8000;

// Body Parser Middleware
app.use(express.json({ limit: '10kb' })); // Body limit is 10kb
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// CORS Configuration
app.use(
  cors({
    origin: env.CLIENT_URL || 'http://localhost:3001',
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

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${env.NODE_ENV} mode`);
});
