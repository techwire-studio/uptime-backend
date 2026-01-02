import { catchAsync } from '@/middlewares/error';
import prisma from '@/prisma';
import {
  CreateAlertChannelType,
  UpdateTagsType,
  WorkspaceMembers
} from '@/types/workspace';
import {
  sendSuccessResponse,
  sendErrorResponse
} from '@/utils/responseHandler';
import { RequestHandler } from 'express';

/**
 * Create a workspace along with its members
 */
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

/**
 * @route POST /workspaces
 * @description Create a new workspace with members
 */
export const createWorkspace: RequestHandler = catchAsync(
  async (request, response) => {
    const { ownerId, userIds = [] } = request.body;

    if (!ownerId) {
      return sendErrorResponse({
        response,
        message: 'Owner Id is required'
      });
    }

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

/**
 * @route POST /workspaces/:workspaceId/integrations
 * @description Create an alert channel for a workspace
 */
export const createAlertChannels: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const { type, config, events } = request.body as CreateAlertChannelType;

    const channel = await prisma.alert_channels.create({
      data: {
        workspace_id: workspaceId,
        type,
        destination: JSON.stringify(config)
      }
    });

    await prisma.alert_rules.upsert({
      where: {
        workspace_id_alert_type: {
          workspace_id: workspaceId,
          alert_type: type
        }
      },
      update: {
        enabled: true,
        events: events
      },
      create: {
        workspace_id: workspaceId,
        alert_type: type,
        enabled: true,
        events: events
      }
    });

    sendSuccessResponse({
      response,
      data: channel,
      message: 'Alert channel created successfully'
    });
  }
);

/**
 * @route GET /workspaces/:workspaceId/integrations
 * @description Fetch all alert channels for a workspace
 */
export const getAlertChannels: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const channels = await prisma.alert_channels.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: 'desc' }
    });

    sendSuccessResponse({
      response,
      message: 'Fetched alert channels successfully',
      data: channels
    });
  }
);

/**
 * @route GET /workspaces/:workspaceId/alert-rules
 * @description Fetch all alert rules for a workspace
 */
export const getAlertRules: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const rules = await prisma.alert_rules.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: 'desc' }
    });

    sendSuccessResponse({
      response,
      message: 'Fetched alert rules successfully',
      data: rules
    });
  }
);

/**
 * @route PATCH /alert-rules/:ruleId
 * @description Update an alert rule by its Id
 */
export const updateAlertRule: RequestHandler = catchAsync(
  async (request, response) => {
    const { ruleId } = request.params;

    if (!ruleId) {
      return sendErrorResponse({
        response,
        message: 'Rule Id is required'
      });
    }

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
      message: 'Alert rule updated successfully',
      data: updatedRule
    });
  }
);

/**
 * @route GET /users/:userId/workspaces
 * @description Fetch all workspaces where the user is a member or owner
 */
export const getUserWorkspaces: RequestHandler = catchAsync(
  async (request, response) => {
    const { userId } = request.params;

    if (!userId) {
      return sendErrorResponse({
        response,
        message: 'User Id is required'
      });
    }

    const workspaces = await getWorkspaceByUserId(userId);

    sendSuccessResponse({
      response,
      message: 'Fetched user workspaces successfully',
      data: workspaces
    });
  }
);

/**
 * Utility function to fetch workspace IDs for a given user
 */
export const getWorkspaceByUserId = async (userId: string) => {
  return prisma.workspaces.findMany({
    where: {
      OR: [{ owner_id: userId }, { members: { some: { user_id: userId } } }]
    },
    select: { id: true }
  });
};

export const deleteUserAndRelatedData = (userId: string) => {
  return prisma.$transaction(async (tx) => {
    const ownedWorkspaces = await tx.workspaces.findMany({
      where: { owner_id: userId },
      select: { id: true }
    });

    const workspaceIds = ownedWorkspaces.map((w) => w.id);

    if (workspaceIds.length > 0) {
      await tx.alerts_sent.deleteMany({
        where: { incident: { workspace_id: { in: workspaceIds } } }
      });

      await tx.incidents.deleteMany({
        where: { workspace_id: { in: workspaceIds } }
      });

      await tx.monitor_checks.deleteMany({
        where: { monitor: { workspace_id: { in: workspaceIds } } }
      });

      await tx.monitors.deleteMany({
        where: { workspace_id: { in: workspaceIds } }
      });

      await tx.alert_rules.deleteMany({
        where: { workspace_id: { in: workspaceIds } }
      });

      await tx.alert_channels.deleteMany({
        where: { workspace_id: { in: workspaceIds } }
      });

      await tx.status_pages.deleteMany({
        where: { workspace_id: { in: workspaceIds } }
      });

      await tx.workspace_members.deleteMany({
        where: { workspace_id: { in: workspaceIds } }
      });

      await tx.workspaces.deleteMany({
        where: { id: { in: workspaceIds } }
      });
    }

    await tx.workspace_members.deleteMany({
      where: { user_id: userId }
    });

    await tx.session.deleteMany({
      where: { userId }
    });

    await tx.account.deleteMany({
      where: { userId }
    });

    await tx.user_metadata.deleteMany({
      where: { user_id: userId }
    });

    await tx.user.delete({
      where: { id: userId }
    });
  });
};

export const getWorkspaceTags: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const tags = await prisma.tags.findMany({
      where: {
        workspace_id: workspaceId
      },
      select: {
        id: true,
        name: true,
        monitors: {
          select: {
            monitor: {
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    const formatted = tags.map((tag) => ({
      ...tag,
      monitors: tag.monitors.map((m) => m.monitor.id)
    }));

    sendSuccessResponse({
      response,
      message: 'Fetched workspace tags successfully',
      data: formatted
    });
  }
);

export const updateWorkspaceTags: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;
    const {
      monitorId,
      addedTags = [],
      removedTags = []
    } = request.body as UpdateTagsType;

    if (!workspaceId || !monitorId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id and Monitor Id are required'
      });
    }

    await prisma.$transaction(async (tx) => {
      if (addedTags.length > 0) {
        await tx.monitor_tags.createMany({
          data: addedTags.map((tagId: string) => ({
            tag_id: tagId,
            monitor_id: monitorId
          })),
          skipDuplicates: true
        });
      }

      if (removedTags.length > 0) {
        await tx.monitor_tags.deleteMany({
          where: {
            monitor_id: monitorId,
            tag_id: {
              in: removedTags
            }
          }
        });
      }
    });

    sendSuccessResponse({
      response,
      data: null,
      message: 'Tags updated successfully'
    });
  }
);
