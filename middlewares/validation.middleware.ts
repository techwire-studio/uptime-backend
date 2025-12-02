import type { ZodSchema } from 'zod';
import type { Request, Response, NextFunction } from 'express';

export const validateRequestPayload = <T>(schema: ZodSchema<T>) => {
  return (request: Request, _: Response, next: NextFunction) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      const formattedErrors = result?.error?.issues?.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }));

      return next({
        statusCode: 400,
        message: 'Validation failed',
        errors: formattedErrors
      });
    }

    return next();
  };
};
