import { catchAsync } from '@/middlewares/error';
import prisma from '@/prisma';
import { uploadFile } from '@/services/s3';
import {
  CreateStatusPageType,
  StatusPageAccessLevelEnum,
  StatusPageStatusEnum,
  UpdateStatusPageType
} from '@/types/status';
import { safeJsonParse } from '@/utils/common';
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
    const { name, workspace_id, monitor_ids, configs, custom_domain } =
      request.body as CreateStatusPageType;

    const files = request.files as {
      logo?: Express.Multer.File[];
      favicon?: Express.Multer.File[];
    };

    const parsedConfigs = safeJsonParse(configs);
    const parsedMonitorIds = safeJsonParse(monitor_ids);

    const logo = files?.logo?.[0] || null;
    const favicon = files?.favicon?.[0] || null;

    let logoUrl: string | null = null;
    let faviconUrl: string | null = null;

    if (logo) {
      logoUrl = await uploadFile(
        logo,
        `status-pages/${workspace_id}/${Date.now()}-logo`
      );
    }

    if (favicon) {
      faviconUrl = await uploadFile(
        favicon,
        `status-pages/${workspace_id}/${Date.now()}-favicon`
      );
    }

    const statusPage = await prisma.status_pages.create({
      data: {
        name,
        custom_domain,
        workspace_id,
        configs: {
          ...parsedConfigs,
          branding: {
            ...(parsedConfigs?.branding ?? {}),
            ...(logoUrl && { logoUrl }),
            ...(faviconUrl && { faviconUrl })
          }
        },
        access_level: StatusPageAccessLevelEnum.PUBLIC,
        status: StatusPageStatusEnum.PUBLISHED,
        monitors: {
          connect: parsedMonitorIds?.map((id: string) => ({ id })) || []
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
    const { id } = request.params;

    if (!id)
      return sendErrorResponse({
        response,
        message: 'Status Id is required'
      });

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
              select: { id: true, checked_at: true, success: true },
              take: 20,
              orderBy: { checked_at: 'desc' },
              where: {
                checked_at: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
              }
            }
          }
        }
      }
    });

    if (!statusPage)
      return sendErrorResponse({ response, message: 'Status page not found' });

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
    const { workspaceId } = request.params;

    if (!workspaceId)
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });

    const statusPages = await prisma.status_pages.findMany({
      where: { workspace_id: workspaceId },
      include: {
        monitors: { select: { id: true } }
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
    const { id } = request.params;
    if (!id)
      return sendErrorResponse({
        response,
        message: 'Status Id is required'
      });

    await prisma.status_pages.delete({ where: { id } });

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
    const { id } = request.params;
    const { name, status, monitor_ids, configs } =
      request.body as UpdateStatusPageType;

    if (!id)
      return sendErrorResponse({
        response,
        message: 'Status Id is required'
      });

    const existing = await prisma.status_pages.findUnique({
      where: { id },
      include: { monitors: { select: { id: true } } }
    });

    if (!existing)
      return sendErrorResponse({ response, message: 'Status page not found' });

    const files = request.files as {
      logo?: Express.Multer.File[];
      favicon?: Express.Multer.File[];
    };

    const parsedConfigs = safeJsonParse(configs ?? existing.configs);
    const parsedMonitorIds = safeJsonParse(
      monitor_ids ?? existing.monitors.map((m) => m.id)
    );

    const logo = files?.logo?.[0] || null;
    const favicon = files?.favicon?.[0] || null;

    let logoUrl = parsedConfigs?.branding?.logoUrl ?? null;
    let faviconUrl = parsedConfigs?.branding?.faviconUrl ?? null;

    if (logo) {
      logoUrl = await uploadFile(
        logo,
        `status-pages/${existing.workspace_id}/${Date.now()}-logo`
      );
    }

    if (favicon) {
      faviconUrl = await uploadFile(
        favicon,
        `status-pages/${existing.workspace_id}/${Date.now()}-favicon`
      );
    }

    const updatedPage = await prisma.status_pages.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        status: status ?? existing.status,
        configs: {
          ...parsedConfigs,
          branding: {
            ...(parsedConfigs?.branding ?? {}),
            ...(logoUrl && { logoUrl }),
            ...(faviconUrl && { faviconUrl })
          }
        },
        monitors: {
          set: parsedMonitorIds.map((monitor: any) =>
            typeof monitor === 'object' ? { id: monitor.id } : { id: monitor }
          )
        }
      }
    });

    sendSuccessResponse({
      response,
      data: updatedPage,
      message: 'Status page updated successfully'
    });
  }
);
