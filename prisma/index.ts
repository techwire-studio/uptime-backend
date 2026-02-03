import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { env } from '../configs/env';

const adapter = new PrismaNeon({
  connectionString: env.DATABASE_URL
});

export default new PrismaClient({ adapter });
