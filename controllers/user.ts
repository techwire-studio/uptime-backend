import { catchAsync } from '@/middlewares/error';
import prisma from '@/prisma';
import { UpdateUserMetadataType } from '@/types/user';
import { toPrismaUpdateInput } from '@/utils/common';
import {
  sendSuccessResponse,
  sendErrorResponse
} from '@/utils/responseHandler';
import { RequestHandler } from 'express';

/**
 * @route PATCH /user/:id/metadata
 * @description Update or create metadata for a user
 */
export const updateUserMetadata: RequestHandler = catchAsync(
  async (request, response) => {
    const userId = request.params.id;

    if (!userId) {
      return sendErrorResponse({
        response,
        message: 'User Id is required'
      });
    }

    const payload = request.body;

    const updateData = toPrismaUpdateInput<UpdateUserMetadataType>(payload);

    const metadata = await prisma.user_metadata.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        timezone: payload.timezone ?? 'Etc/UTC',
        locale: payload.locale ?? 'en-US',
        sms_country_code: payload.sms_country_code,
        sms_phone_number: payload.sms_phone_number,
        sms_verified: payload.sms_verified ?? false,
        call_country_code: payload.call_country_code,
        call_phone_number: payload.call_phone_number,
        call_verified: payload.call_verified ?? false,
        preferences: payload.preferences
      },
      update: updateData.payload
    });

    sendSuccessResponse({
      response,
      message: 'User metadata updated successfully',
      data: metadata
    });
  }
);

/**
 * @route GET /user/:id/metadata
 * @description Fetch metadata for a user
 */
export const getUserMetadata: RequestHandler = catchAsync(
  async (request, response) => {
    const userId = request.params.id;

    if (!userId) {
      return sendErrorResponse({
        response,
        message: 'User Id is required'
      });
    }

    const metadata = await prisma.user_metadata.findUnique({
      where: { user_id: userId }
    });

    sendSuccessResponse({
      response,
      message: metadata
        ? 'Fetched user metadata successfully'
        : 'User metadata not found',
      data: metadata
    });
  }
);
