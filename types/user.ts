import { updateUserMetadataSchema } from '@/validations/user';
import z from 'zod';

export type UpdateUserMetadataType = z.infer<typeof updateUserMetadataSchema>;
