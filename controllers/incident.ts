import prisma from '@/prisma';
import {
  sendErrorResponse,
  sendSuccessResponse
} from '@/utils/responseHandler';
import { catchAsync } from '@/middlewares/error';
import type { RequestHandler } from 'express';

/**
 * @route GET /monitors/:monitorId/incidents
 * @description Fetch incidents for a monitor within a start and end date, including monitor info
 * @param {string} monitorId - ID of the monitor (from route params)
 * @queryParam {string} start - Start date in ISO format (required)
 * @queryParam {string} end - End date in ISO format (required)
 * @queryParam {string} [status] - Optional status filter
 * @returns {Array} List of incidents with monitor info
 */
export const getIncidentByMonitorId: RequestHandler = catchAsync(
  async (request, response) => {
    const { id } = request.params as { id: string };
    const { start, end } = request.query;

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return sendErrorResponse({
        response,
        statusCode: 400,
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
 * @param {string} id - ID of the incident (from route params)
 * @returns {Object} Incident with related monitor/check info
 */
export const getIncidentById: RequestHandler = catchAsync(
  async (request, response) => {
    const { id } = request.params as { id: string };

    const incident = await prisma.incidents.findUnique({
      where: { id },
      include: {
        monitor: {
          select: {
            name: true,
            type: true,
            url: true
          }
        },
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

    sendSuccessResponse({
      response,
      data: incident,
      message: incident ? `Incident fetched successfully` : 'Incident not found'
    });
  }
);

/**
 * @route GET /incidents
 * @description Get paginated list of incidents including monitor + check details
 * @queryParam {number} [page=1] - Page number
 * @queryParam {number} [limit=10] - Number of items per page
 * @returns {Array} List of incidents with monitor name, url, checks, timestamps
 */
export const getAllIncidents: RequestHandler = catchAsync(
  async (request, response) => {
    const page = parseInt(request.query.page as string) || 1;
    const limit = parseInt(request.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const incidents = await prisma.incidents.findMany({
      skip,
      take: limit,
      include: {
        monitor: {
          select: {
            name: true,
            url: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    sendSuccessResponse({
      response,
      data: incidents,
      message: 'Incidents fetched successfully'
    });
  }
);
