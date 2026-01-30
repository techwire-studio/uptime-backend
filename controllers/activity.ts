import { catchAsync } from '@/middlewares/error';
import prisma from '@/prisma';
import { Prisma } from '@/prisma/generated/prisma/client';
import {
  CreateActivityLogInput,
  CreateCommentType,
  UpdateCommentType
} from '@/types/activity';
import {
  sendErrorResponse,
  sendSuccessResponse
} from '@/utils/responseHandler';
import { RequestHandler } from 'express';

/**
 * @route GET /incidents/:incidentId/comments
 * @description Get all comments for an incident
 */
export const getIncidentComments: RequestHandler = catchAsync(
  async (request, response) => {
    const { incidentId } = request.params;

    if (!incidentId)
      return sendErrorResponse({
        response,
        message: 'Incident Id is required'
      });

    const comments = await prisma.incident_comments.findMany({
      where: { incident_id: incidentId },
      select: {
        id: true,
        content: true,
        publish_on_status_page: true,
        created_at: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    sendSuccessResponse({
      response,
      data: comments,
      message: 'Comments fetched successfully'
    });
  }
);

/**
 * @route POST /incidents/:incidentId/comments
 * @description Add a comment to an incident
 */
export const createIncidentComment: RequestHandler = catchAsync(
  async (request, response) => {
    const { incidentId } = request.params;
    const { content, workspace_id, publishOnStatusPage } =
      request.body as CreateCommentType;
    const userId = request.userId;

    if (!incidentId)
      return sendErrorResponse({
        response,
        message: 'Incident Id is required'
      });

    const incident = await prisma.incidents.findUnique({
      where: { id: incidentId }
    });

    if (!incident)
      return sendErrorResponse({
        response,
        message: 'Incident not found'
      });

    const comment = await prisma.incident_comments.create({
      data: {
        incident_id: incidentId,
        user_id: userId,
        publish_on_status_page: publishOnStatusPage,
        workspace_id,
        content
      }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    await createActivityLog({
      workspace_id,
      action: 'comment.created',
      entity_type: 'incident_comment',
      entity_id: incidentId,
      actor_user_id: userId,
      message: `${user?.name ?? user?.email ?? 'A user'} has left a comment`,
      metadata: { comment_id: comment.id }
    });

    sendSuccessResponse({
      response,
      data: comment,
      message: 'Comment added successfully'
    });
  }
);

/**
 * @route PATCH /comments/:id
 * @description Update a comment
 */
export const updateIncidentComment: RequestHandler = catchAsync(
  async (request, response) => {
    const { id } = request.params;
    const { content } = request.body as UpdateCommentType;
    const userId = request.userId;

    if (!id)
      return sendErrorResponse({
        response,
        message: 'Comment Id is required'
      });

    const existing = await prisma.incident_comments.findUnique({
      where: { id }
    });

    if (!existing)
      return sendErrorResponse({
        response,
        message: 'Comment not found'
      });

    if (existing.user_id !== userId)
      return sendErrorResponse({
        response,
        message: 'You are not allowed to edit this comment'
      });

    const updatedComment = await prisma.incident_comments.update({
      where: { id },
      data: { content }
    });

    sendSuccessResponse({
      response,
      data: updatedComment,
      message: 'Comment updated successfully'
    });
  }
);

/**
 * @route DELETE /comments/:id
 * @description Delete a comment
 */
export const deleteIncidentComment: RequestHandler = catchAsync(
  async (request, response) => {
    const { id } = request.params;
    const userId = request.userId;

    if (!id)
      return sendErrorResponse({
        response,
        message: 'Comment Id is required'
      });

    const existing = await prisma.incident_comments.findUnique({
      where: { id }
    });

    if (!existing)
      return sendErrorResponse({
        response,
        message: 'Comment not found'
      });

    if (existing.user_id !== userId)
      return sendErrorResponse({
        response,
        message: 'You are not allowed to delete this comment'
      });

    await prisma.incident_comments.delete({ where: { id } });

    sendSuccessResponse({
      response,
      data: null,
      message: 'Comment deleted successfully'
    });
  }
);

export const createActivityLog = async (payload: CreateActivityLogInput) => {
  const {
    workspace_id,
    action,
    entity_type,
    entity_id = null,
    actor_user_id = null,
    message = null,
    metadata = null
  } = payload;

  return prisma.activity_logs.create({
    data: {
      workspace_id,
      action,
      entity_type,
      entity_id,
      actor_user_id,
      message,
      ...(metadata && { metadata: metadata as Prisma.InputJsonValue })
    }
  });
};

/**
 * @route GET /workspaces/:workspaceId/activity-logs/:entityId
 * @description Fetch all activity logs for a specific entity in a workspace
 */
export const getActivityLogsByEntity: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId, entityId } = request.params;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace ID is required'
      });
    }

    if (!entityId) {
      return sendErrorResponse({
        response,
        message: 'Entity ID is required'
      });
    }

    const logs = await prisma.activity_logs.findMany({
      where: {
        entity_id: entityId,
        workspace_id: workspaceId
      },
      orderBy: { created_at: 'desc' },
      include: {
        actor: { select: { id: true, name: true, email: true } }
      }
    });

    sendSuccessResponse({
      response,
      data: logs,
      message: 'Activity logs fetched successfully'
    });
  }
);
