import prisma from '@/prisma';
import {
  sendErrorResponse,
  sendSuccessResponse
} from '@/utils/responseHandler';
import { catchAsync } from '@/middlewares/error';
import type { RequestHandler } from 'express';

/**
 * @route GET /monitors/:id/incidents
 * @description Fetch incidents for a monitor within a start and end date
 * @queryParam {string} start - Start date in ISO format (required)
 * @queryParam {string} end - End date in ISO format (required)
 */
export const getIncidentByMonitorId: RequestHandler = catchAsync(
  async (request, response) => {
    const { id } = request.params;
    const { start, end } = request.query;

    if (!id) {
      return sendErrorResponse({
        response,
        message: 'Monitor Id is required'
      });
    }

    if (!start || !end) {
      return sendErrorResponse({
        response,
        message: 'Both start and end dates are required'
      });
    }

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return sendErrorResponse({
        response,
        message:
          'Invalid date format for start or end. Use ISO format (YYYY-MM-DDTHH:MM:SSZ)'
      });
    }

    const incidents = await prisma.incidents.findMany({
      where: {
        monitor_id: id,
        created_at: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { created_at: 'desc' }
    });

    sendSuccessResponse({
      response,
      data: incidents,
      message: incidents.length
        ? `Fetched ${incidents.length} incident(s) successfully`
        : 'No incidents found for the given criteria'
    });
  }
);

/**
 * @route GET /incidents/:id
 * @description Fetch a single incident by ID, including monitor, check, and resolved_check info
 */
export const getIncidentById: RequestHandler = catchAsync(
  async (request, response) => {
    const { id } = request.params;

    if (!id) {
      return sendErrorResponse({
        response,
        message: 'Incident Id is required'
      });
    }

    const incident = await prisma.incidents.findUnique({
      where: { id },
      include: {
        monitor: { select: { name: true, type: true, url: true } },
        check: {
          select: {
            id: true,
            checked_at: true,
            status: true,
            response_body: true,
            response_headers: true,
            request_headers: true
          }
        },
        resolved_check: {
          select: {
            id: true,
            checked_at: true,
            status: true,
            request_headers: true,
            response_body: true,
            response_headers: true
          }
        }
      }
    });

    if (!incident) {
      return sendErrorResponse({
        response,
        statusCode: 404,
        message: 'Incident not found'
      });
    }

    sendSuccessResponse({
      response,
      data: incident,
      message: 'Incident fetched successfully'
    });
  }
);

/**
 * @route GET /workspaces/:workspaceId/incidents
 * @description Get paginated list of incidents for a workspace including monitor info
 * @queryParam {number} [page=1] - Page number
 * @queryParam {number} [limit=10] - Number of items per page
 */
export const getWorkspaceIncidents: RequestHandler = catchAsync(
  async (request, response) => {
    const page = parseInt(request.query.page as string) || 1;
    const limit = parseInt(request.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const { workspaceId } = request.params;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const incidents = await prisma.incidents.findMany({
      where: { workspace_id: workspaceId },
      skip,
      take: limit,
      include: {
        monitor: {
          select: {
            name: true,
            url: true,
            tags: {
              select: {
                tag: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const normalized = incidents.map((i) => ({
      ...i,
      monitor: i.monitor && {
        ...i.monitor,
        tags: i.monitor.tags.map((t) => ({
          id: t.tag.id,
          name: t.tag.name
        }))
      }
    }));

    sendSuccessResponse({
      response,
      data: normalized,
      message: incidents.length
        ? `Fetched ${incidents.length} incident(s) successfully`
        : 'No incidents found for the given workspace'
    });
  }
);
