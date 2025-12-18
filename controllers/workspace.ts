import { catchAsync } from '@/middlewares/error';
import prisma from '@/prisma';
import { CreateAlertChannelType, WorkspaceMembers } from '@/types/workspace';
import { sendSuccessResponse } from '@/utils/responseHandler';
import { RequestHandler } from 'express';

export const createWorkspaceWithMembers = async ({
  name,
  ownerId,
  userIds
}: {
  name: string;
  ownerId: string;
  userIds: string[];
}) => {
  return prisma.workspaces.create({
    data: {
      name,
      owner_id: ownerId,
      members: {
        createMany: {
          data: userIds.map((userId) => ({
            user_id: userId,
            role:
              userId === ownerId
                ? WorkspaceMembers.OWNER
                : WorkspaceMembers.MEMBER
          }))
        }
      }
    }
  });
};

export const createWorkspace: RequestHandler = catchAsync(
  async (request, response) => {
    const { ownerId, userIds = [] } = request.body as {
      ownerId: string;
      userIds: string[];
    };

    const workspace = await createWorkspaceWithMembers({
      name: 'Workspace 1',
      ownerId,
      userIds: Array.from(new Set([ownerId, ...userIds]))
    });

    sendSuccessResponse({
      response,
      message: 'Workspace created successfully',
      data: workspace
    });
  }
);

export const createAlertChannels: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const { type, config } = request.body as CreateAlertChannelType;

    const channel = await prisma.alert_channels.create({
      data: {
        workspace_id: workspaceId,
        type,
        destination: JSON.stringify(config)
      }
    });

    sendSuccessResponse({
      response,
      data: {
        ...channel,
        destination: config
      },
      message: 'Alert channel created successfully'
    });
  }
);

export const getAlertChannels: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params as { workspaceId: string };

    const channels = await prisma.alert_channels.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: 'desc' }
    });

    const result = channels.map((channel) => ({
      ...channel,
      destination: JSON.parse(channel.destination)
    }));

    sendSuccessResponse({
      response,
      message: 'Fetched Alert Channels',
      data: result
    });
  }
);

export const getAlertRules: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params as { workspaceId: string };

    const rules = await prisma.alert_rules.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: 'desc' }
    });

    sendSuccessResponse({
      response,
      message: 'Fetched Alert Rules',
      data: rules
    });
  }
);

export const updateAlertRule: RequestHandler = catchAsync(
  async (request, response) => {
    const { ruleId } = request.params as { ruleId: string };
    const { events, enabled } = request.body as {
      events?: string[];
      enabled?: boolean;
    };

    const updatedRule = await prisma.alert_rules.update({
      where: { id: ruleId },
      data: {
        ...(events && { events }),
        ...(typeof enabled === 'boolean' && { enabled })
      }
    });

    sendSuccessResponse({
      response,
      message: 'Alert rule updated',
      data: updatedRule
    });
  }
);

export const getUserWorkspaces: RequestHandler = catchAsync(
  async (request, response) => {
    const { userId } = request.params as { userId: string };

    const workspaces = await getWorkspaceByUserId(userId);

    sendSuccessResponse({
      response,
      message: 'Fetched user workspaces',
      data: workspaces
    });
  }
);

export const getWorkspaceByUserId = async (userId: string) => {
  return prisma.workspaces.findMany({
    where: {
      OR: [
        { owner_id: userId },
        {
          members: {
            some: { user_id: userId }
          }
        }
      ]
    },
    select: {
      id: true
    }
  });
};
