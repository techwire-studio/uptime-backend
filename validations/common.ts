import { z } from 'zod';

export const zNumberFromString = (errorMessage = 'Must be a valid number') =>
  z.string().regex(/^\d+$/, { message: errorMessage }).transform(Number);

export const zEnumFromEnv = <T extends [string, ...string[]]>(values: T) =>
  z.enum(values);

export const zEmail = () =>
  z
    .string()
    .email({ message: 'Please provide a valid email' })
    .transform((value) => value.toLowerCase().trim());

export const zPassword = () =>
  z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/, {
      message:
        'Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character'
    });

export const zName = (
  fieldName = 'Name',
  min = 1,
  max = 50,
  isOptional = false
) => {
  const base = z
    .string()
    .trim()
    .min(min, {
      message: `${fieldName} must be between ${min} and ${max} characters`
    })
    .max(max, {
      message: `${fieldName} must be between ${min} and ${max} characters`
    });

  return isOptional ? base.optional() : base;
};

export const zURL = () =>
  z.string().url({ message: 'Please provide a valid URL' });

export const zPrice = (fieldName = 'Price') =>
  z
    .number({ message: `${fieldName} must be a number` })
    .nonnegative({ message: `${fieldName} must be a positive number` });

export const zRequiredString = (fieldName: string) =>
  z.string().min(1, { message: `${fieldName} is required` });

export const zBoolean = (isOptional = false) => {
  const base = z.boolean();
  return isOptional ? base.optional() : base;
};

export const commonSchemas = {
  zEmail,
  zPassword,
  zName,
  zURL,
  zNumberFromString,
  zEnumFromEnv
};
