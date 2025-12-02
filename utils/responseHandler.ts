import { STATUS_CODES } from '@/constants';
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  SendSuccessResponse,
  SendErrorResponse
} from '@/types/response';

export const sendSuccessResponse = <T>({
  response,
  message,
  data,
  statusCode = STATUS_CODES.OK
}: SendSuccessResponse<T>): void => {
  const successResponse: ApiSuccessResponse<T> = {
    success: true,
    message,
    data
  };
  response.status(statusCode).json(successResponse);
};

export const sendErrorResponse = ({
  response,
  message,
  statusCode = STATUS_CODES.INTERNAL_SERVER_ERROR,
  errors,
  stack
}: SendErrorResponse): void => {
  const errorResponse: ApiErrorResponse = {
    success: false,
    message,
    ...(errors !== undefined && { errors }),
    ...(stack !== undefined && { stack })
  };

  response.status(statusCode).json(errorResponse);
};
