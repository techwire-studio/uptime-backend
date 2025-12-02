import type { Response } from 'express';

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T | null;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: { path: string; message: string }[];
  stack?: string;
}

export type SendSuccessResponse<T> = {
  response: Response;
  message: string;
  data: T | null;
  statusCode?: number;
};

export interface SendErrorResponse {
  response: Response;
  message: string;
  statusCode?: number;
  errors?: { path: string; message: string }[] | undefined;
  stack?: string | undefined;
}

export interface ApiErrorProps {
  message: string;
  statusCode: number;
  errors?: { path: string; message: string }[] | undefined;
  stack?: string;
  isOperational?: boolean;
}

export class ApiError extends Error implements ApiErrorProps {
  public statusCode: number;
  public errors?: { path: string; message: string }[] | undefined;
  public isOperational: boolean;

  constructor({
    message,
    statusCode,
    errors,
    stack,
    isOperational = true
  }: ApiErrorProps) {
    super(message);

    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;

    // Maintains proper stack trace (only in V8)
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
