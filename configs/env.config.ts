import { z } from 'zod';
import dotenv from 'dotenv';
import logger from '@/utils/logger';
import { zEnumFromEnv, zNumberFromString, zURL } from '@/validations/common';

dotenv.config();

const envSchema = z.object({
  PORT: zNumberFromString('PORT must be a valid number'),
  NODE_ENV: zEnumFromEnv(['development', 'production', 'test']),
  CLIENT_URL: zURL()
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
