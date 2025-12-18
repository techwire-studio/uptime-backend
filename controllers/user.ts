import { catchAsync } from '@/middlewares/error';
import prisma from '@/prisma';
import { UpdateUserMetadataType } from '@/types/user';
import { toPrismaUpdateInput } from '@/utils/common';
import { sendSuccessResponse } from '@/utils/responseHandler';
import { RequestHandler } from 'express';

export const updateUserMetadata: RequestHandler = catchAsync(
  async (request, response) => {
    const userId = request.params.id as string;

    const payload = request.body;

    const updateData = toPrismaUpdateInput<UpdateUserMetadataType>(payload);

    const metadata = await prisma.user_metadata.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        timezone: payload.timezone ?? 'GMT',
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
      message: 'User metadata updated',
      data: metadata
    });
  }
);

export const getUserMetadata: RequestHandler = catchAsync(
  async (request, response) => {
    const userId = request.params.id as string;

    const metadata = await prisma.user_metadata.findUnique({
      where: { user_id: userId }
    });

    if (!metadata) {
      return sendSuccessResponse({
        response,
        message: 'User metadata not found',
        data: null
      });
    }

    sendSuccessResponse({
      response,
      message: 'Fetched user metadata',
      data: metadata
    });
  }
);
