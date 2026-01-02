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
  statusCode = 200
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
  statusCode = 500,
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
