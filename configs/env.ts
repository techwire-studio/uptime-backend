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
  DATABASE_URL: zRequiredString('DATABASE_URL'),
  RABBITMQ_URL: zRequiredString('RABBITMQ_URL'),

  // Gmail (Email alerts)
  GMAIL_USER: zRequiredString('GMAIL_USER'),
  GMAIL_PASS: zRequiredString('GMAIL_PASS'),

  // WhatsApp Business API
  WHATSAPP_APP_ID: zRequiredString('WHATSAPP_APP_ID'),
  WHATSAPP_APP_SECRET: zRequiredString('WHATSAPP_APP_SECRET'),
  WHATSAPP_SYSTEM_USER_TOKEN: zRequiredString('WHATSAPP_SYSTEM_USER_TOKEN'),
  WHATSAPP_VERSION: zRequiredString('WHATSAPP_VERSION'),
  WHATSAPP_PHONE_NUMBER_ID: zRequiredString('WHATSAPP_PHONE_NUMBER_ID'),
  WHATSAPP_RECIPIENT_TEST_NUMBER: zRequiredString(
    'WHATSAPP_RECIPIENT_TEST_NUMBER'
  ),

  // Better Auth
  BETTER_AUTH_SECRET: zRequiredString('  BETTER_AUTH_SECRET'),

  // AWS
  AWS_ACCESS_KEY_ID: zRequiredString('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: zRequiredString('AWS_SECRET_ACCESS_KEY'),
  AWS_REGION: zRequiredString('AWS_REGION'),

  // Razorpay
  RAZORPAY_KEY_ID: zRequiredString('RAZORPAY_KEY_ID'),
  RAZORPAY_KEY_SECRET: zRequiredString('RAZORPAY_KEY_SECRET'),
  RAZORPAY_WEBHOOK_SECRET: zRequiredString('RAZORPAY_WEBHOOK_SECRET'),

  // Integrations
  PUSH_OVER_APP_TOKEN: zRequiredString('PUSH_OVER_APP_TOKEN'),

  // BRICKPAY
  BRICKPAY_API_URL: zRequiredString('BRICKPAY_API_URL'),
  BRICKYPAY_CLIENT_ID: zRequiredString('BRICKYPAY_CLIENT_ID'),
  BRICKYPAY_CLIENT_SECRET: zRequiredString('BRICKYPAY_CLIENT_SECRET')
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
