import { z } from 'zod';

export const updateUserMetadataSchema = z.object({
  timezone: z.string().optional(),
  locale: z.string().optional(),

  sms_country_code: z.string().optional(),
  sms_phone_number: z.string().optional(),
  sms_verified: z.boolean().optional(),

  call_country_code: z.string().optional(),
  call_phone_number: z.string().optional(),
  call_verified: z.boolean().optional(),

  preferences: z.record(z.string(), z.any()).optional()
});
