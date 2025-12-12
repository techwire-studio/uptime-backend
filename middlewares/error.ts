import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { env } from '@/configs/env';
import { sendErrorResponse } from '@/utils/responseHandler';
import { ApiError } from '@/types/response';

export const errorHandler = (
  error: ApiError,
  _: Request,
  response: Response,
  __: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Something went wrong';
  const errors = error.errors || undefined;
  const stack = env.NODE_ENV === 'development' ? error.stack : undefined;

  sendErrorResponse({ response, message, statusCode, errors, stack });
};

export const catchAsync = (
  fn: (request: Request, response: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (request, response, next) => {
    fn(request, response, next).catch(next);
  };
};
