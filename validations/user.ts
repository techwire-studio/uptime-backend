import { z } from 'zod';

export const updateUserMetadataSchema = z.object({
  timezone: z.string().trim().optional(),
  locale: z.string().trim().optional(),
  sms_country_code: z.string().trim().optional(),
  sms_phone_number: z.string().trim().optional(),
  sms_verified: z.boolean().optional(),
  call_country_code: z.string().trim().optional(),
  call_phone_number: z.string().trim().optional(),
  call_verified: z.boolean().optional(),
  preferences: z.record(z.string().trim(), z.any()).optional()
});
