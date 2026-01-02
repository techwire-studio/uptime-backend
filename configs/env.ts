import { z } from 'zod';
import dotenv from 'dotenv';
import logger from '@/utils/logger';
import {
  zEnumFromEnv,
  zNumberFromString,
  zRequiredString,
  zURL
} from '@/validations/common';

dotenv.config();

export const envSchema = z.object({
  // Server
  PORT: zNumberFromString('PORT must be a valid number'),
  NODE_ENV: zEnumFromEnv(['development', 'production', 'test']),
  CLIENT_URL: zURL(),
  BASE_URL: zURL(),

  // Database & Messaging
  DATABASE_URL: zRequiredString('DATABASE_URL is required'),
  RABBITMQ_URL: zRequiredString('RABBITMQ_URL is required'),

  // Gmail (Email alerts)
  GMAIL_USER: zRequiredString('GMAIL_USER is required'),
  GMAIL_PASS: zRequiredString('GMAIL_PASS is required'),

  // WhatsApp Business API
  WHATSAPP_APP_ID: zRequiredString('WHATSAPP_APP_ID is required'),
  WHATSAPP_APP_SECRET: zRequiredString('WHATSAPP_APP_SECRET is required'),
  WHATSAPP_SYSTEM_USER_TOKEN: zRequiredString(
    'WHATSAPP_SYSTEM_USER_TOKEN is required'
  ),
  WHATSAPP_VERSION: zRequiredString('WHATSAPP_VERSION is required'),
  WHATSAPP_PHONE_NUMBER_ID: zRequiredString(
    'WHATSAPP_PHONE_NUMBER_ID is required'
  ),
  WHATSAPP_RECIPIENT_TEST_NUMBER: zRequiredString(
    'WHATSAPP_RECIPIENT_TEST_NUMBER is required'
  ),

  // Better Auth
  BETTER_AUTH_SECRET: zRequiredString('  BETTER_AUTH_SECRET is required'),

  // AWS
  AWS_ACCESS_KEY_ID: zRequiredString('AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: zRequiredString('AWS_SECRET_ACCESS_KEY is required'),
  AWS_REGION: zRequiredString('AWS_REGION is required')
});

const createEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    logger.error('❌ Invalid environment variables:');
    const formattedErrors = parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message
    }));
    logger.error(formattedErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
};

export const env = createEnv();
export type Env = z.infer<typeof envSchema>;
