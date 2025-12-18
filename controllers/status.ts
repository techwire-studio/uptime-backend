import { catchAsync } from '@/middlewares/error';
import prisma from '@/prisma';
import {
  CreateStatusPageType,
  StatusPageAccessLevelEnum,
  StatusPageStatusEnum,
  UpdateStatusPageType
} from '@/types/status';
import {
  sendErrorResponse,
  sendSuccessResponse
} from '@/utils/responseHandler';
import { RequestHandler } from 'express';

/**
 * @route POST /status
 * @description Create a new status page and link monitors
 */
export const createStatusPage: RequestHandler = catchAsync(
  async (request, response) => {
    const { name, workspace_id, monitor_ids, custom_domain } =
      request.body as CreateStatusPageType;

    const statusPage = await prisma.status_pages.create({
      data: {
        name,
        custom_domain,
        workspace_id,
        access_level: StatusPageAccessLevelEnum.PUBLIC,
        status: StatusPageStatusEnum.PUBLISHED,
        monitors: {
          connect: monitor_ids.map((id) => ({ id }))
        }
      }
    });

    sendSuccessResponse({
      response,
      data: statusPage,
      message: 'Status page created successfully'
    });
  }
);

/**
 * @route GET /status/:id
 * @description Fetch a single status page with its linked monitors
 */
export const getStatusPageById: RequestHandler = catchAsync(
  async (request, response) => {
    const { id } = request.params as { id: string };

    const statusPage = await prisma.status_pages.findUnique({
      where: { id },
      include: {
        monitors: {
          select: {
            id: true,
            name: true,
            url: true,
            type: true,
            last_checked_at: true,
            next_run_at: true,
            checks: {
              select: {
                id: true,
                checked_at: true,
                success: true
              },
              take: 20
              // take: 20,
              // orderBy: { checked_at: 'desc' },
              // where: {
              //   checked_at: {
              //     gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
              //   }
              // }
            }
          }
        }
      }
    });

    if (!statusPage) {
      return sendErrorResponse({
        response,
        message: 'Status page not found'
      });
    }

    sendSuccessResponse({
      response,
      data: statusPage,
      message: 'Status page fetched successfully'
    });
  }
);

/**
 * @route GET /workspace/:workspace_id/status-pages
 * @description Get all status pages for a workspace with linked monitors
 */
export const getWorkspaceStatusPages: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params as { workspaceId: string };

    const statusPages = await prisma.status_pages.findMany({
      where: { workspace_id: workspaceId },
      include: {
        _count: {
          select: { monitors: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    sendSuccessResponse({
      response,
      data: statusPages,
      message: 'Status pages fetched successfully'
    });
  }
);

/**
 * @route DELETE /status/:id
 * @description Delete a single status page
 */
export const deleteStatusPage: RequestHandler = catchAsync(
  async (request, response) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.status_pages.findUnique({
      where: { id }
    });

    if (!existing) {
      return sendErrorResponse({
        response,
        message: 'Status page not found'
      });
    }

    await prisma.status_pages.delete({
      where: { id }
    });

    sendSuccessResponse({
      response,
      data: null,
      message: 'Status page deleted successfully'
    });
  }
);

/**
 * @route PATCH /status/:id
 * @description Update/edit a single status page
 */
export const updateStatusPage: RequestHandler = catchAsync(
  async (request, response) => {
    const { id } = request.params as { id: string };
    const { name, status, monitor_ids } = request.body as UpdateStatusPageType;

    const existing = await prisma.status_pages.findUnique({
      where: { id },
      include: {
        monitors: {
          select: { id: true }
        }
      }
    });

    if (!existing) {
      return sendErrorResponse({
        response,
        message: 'Status page not found'
      });
    }

    const updatedPage = await prisma.status_pages.update({
      where: { id },
      data: {
        name: name || existing.name,
        status: status || existing.status,
        monitors: {
          set: (monitor_ids || existing.monitors).map((monitor) =>
            typeof monitor === 'object' ? { id: monitor.id } : { id: monitor }
          )
        }
      }
    });

    sendSuccessResponse({
      response,
      message: 'Status page updated successfully',
      data: updatedPage
    });
  }
);
