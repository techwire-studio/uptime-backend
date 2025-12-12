import prisma from '@/prisma';
import {
  sendErrorResponse,
  sendSuccessResponse
} from '@/utils/responseHandler';
import { catchAsync } from '@/middlewares/error';
import type { Request, RequestHandler, Response } from 'express';
import {
  CreateMonitorSchemaType,
  MonitorOverallStatus,
  UpdateMonitorSchemaType
} from '@/types/monitor';
import { AlertServicesEnum } from '@/types/alert';

/**
 * @route POST /monitors
 * @description Create a new monitor
 * @returns {object} Created monitor
 */
export const createNewMonitor: RequestHandler = catchAsync(
  async (request: Request, response: Response) => {
    const payload = request.body as CreateMonitorSchemaType;

    const monitor = await prisma.monitors.create({
      data: {
        workspace_id: '69ab2717-c9a7-4359-a254-91bcb0d12e12',
        name: payload.name || payload.url,
        url: payload.url,
        tags: payload.tags,
        type: 'http',
        interval_seconds: payload.interval_seconds || 60,
        timeout_ms: payload.timeout_ms || 5000,
        expected_status: payload.expected_status || 200,
        check_regions: 'us-east-1,eu-west-1',
        status: 'healthy',
        next_run_at: new Date(
          Date.now() + (payload.interval_seconds || 60) * 1000
        ),
        is_active: true,
        consecutive_failures: 0,
        max_retries: 3
      }
    });

    if (payload.alert_channels.email) {
      await prisma.alert_rules.create({
        data: {
          alert_type: AlertServicesEnum.EMAIL,
          enabled: true,
          notify_after_failures: 3,
          monitor_id: monitor.id
        }
      });

      await prisma.alert_channels.create({
        data: {
          workspace_id: '69ab2717-c9a7-4359-a254-91bcb0d12e12',
          destination: 'anshkumar8710@gmail.com',
          type: AlertServicesEnum.EMAIL
        }
      });
    }

    sendSuccessResponse({
      response,
      data: monitor,
      message: 'New monitor created successfully'
    });
  }
);

/**
 * @route GET /monitors
 * @description Get paginated list of monitors
 * @queryParam {number} [page=1] - Page number
 * @queryParam {number} [limit=10] - Number of items per page
 * @queryParam {string} [select] - Comma-separated fields to select
 * @returns {Array} List of monitors
 */
export const getAllMonitors: RequestHandler = catchAsync(
  async (request: Request, response: Response) => {
    const page = parseInt(request.query.page as string) || 1;
    const limit = parseInt(request.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const monitors = await prisma.monitors.findMany({
      skip,
      take: limit,
      include: {
        checks: {
          take: 20,
          orderBy: { checked_at: 'desc' },
          where: {
            checked_at: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          },
          select: {
            id: true,
            checked_at: true,
            success: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    sendSuccessResponse({
      response,
      data: monitors,
      message: 'Monitors fetched successfully'
    });
  }
);

/**
 * @route GET /monitors/:id
 * @description Get monitor details by ID
 * @returns {object} Monitor details with checks and incidents
 */
export const getMonitorById: RequestHandler = catchAsync(
  async (request: Request, response: Response) => {
    const { id } = request.params as { id: string };

    const monitor = await prisma.monitors.findUnique({
      where: { id },
      include: {
        checks: {
          // where: {
          //   checked_at: {
          //     gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          //   }
          // },
          take: 25,
          orderBy: { checked_at: 'desc' }
        }
      }
    });

    if (!monitor) {
      return sendErrorResponse({
        response,
        statusCode: 404,
        message: 'Monitor not found'
      });
    }

    sendSuccessResponse({
      response,
      data: monitor,
      message: 'Monitor fetched successfully'
    });
  }
);

/**
 * @description Get monitors that are due to be checked (next_run_at <= now)
 * @returns {Array} List of due monitors
 */
export const getDueMonitors = async () => {
  const monitors = await prisma.monitors.findMany({
    where: {
      next_run_at: { lte: new Date() },
      is_active: true,
      id: '6b594b8a-e8df-46e0-809c-6db675ca4bb6',
      status: {
        not: MonitorOverallStatus.PAUSED
      }
    }
  });

  return monitors;
};

/**
 * @route PATCH /monitors/:id
 * @description Update an existing monitor by id
 * @returns {object} Updated monitor
 */
export const updateMonitorById: RequestHandler = catchAsync(
  async (request: Request, response: Response) => {
    const { id } = request.params as { id: string };
    const payload = request.body as Partial<UpdateMonitorSchemaType>;

    const updateData: Partial<UpdateMonitorSchemaType> = {};

    const allowedFields: (keyof UpdateMonitorSchemaType)[] = [
      'name',
      'url',
      'type',
      'interval_seconds',
      'timeout_ms',
      'expected_status',
      'tags',
      'check_regions',
      'status',
      'consecutive_failures',
      'max_retries',
      'is_active'
    ];

    for (const field of allowedFields) {
      if (payload[field] !== undefined) {
        updateData[field] = payload[field];
      }
    }

    if (payload.interval_seconds) {
      updateData.next_run_at = new Date(
        Date.now() + payload.interval_seconds * 1000
      );
    }

    const updatedMonitor = await prisma.monitors.update({
      where: { id },
      data: updateData
    });

    sendSuccessResponse({
      response,
      data: updatedMonitor,
      message: 'Monitor updated successfully'
    });
  }
);

/**
 * Delete multiple monitors by IDs.
 *
 * @route DELETE /monitors
 * @body { ids: string[] } - Array of monitor IDs to delete
 */
export const deleteMonitors: RequestHandler = catchAsync(
  async (request, response) => {
    const { ids } = request.body as { ids: string[] };

    await prisma.$transaction([
      prisma.alerts_sent.deleteMany({
        where: { monitor_id: { in: ids } }
      }),

      prisma.incidents.deleteMany({
        where: { monitor_id: { in: ids } }
      }),

      prisma.monitor_checks.deleteMany({
        where: { monitor_id: { in: ids } }
      }),

      prisma.alert_rules.deleteMany({
        where: { monitor_id: { in: ids } }
      }),

      prisma.monitors.deleteMany({
        where: { id: { in: ids } }
      })
    ]);

    sendSuccessResponse({
      response,
      data: null,
      message: `${ids.length} monitor(s) deleted successfully`
    });
  }
);

/**
 * Bulk reset monitors to initial state and delete all stats.
 *
 * @route POST /monitors/reset-stats
 * @body { ids: string[] } - Array of monitor IDs to reset
 */
export const resetMonitorStats: RequestHandler = catchAsync(
  async (request, response) => {
    const { ids } = request.body as { ids: string[] };

    const monitors = await prisma.monitors.findMany({
      where: { id: { in: ids } },
      select: { id: true, workspace_id: true, name: true, url: true }
    });

    if (monitors.length === 0) {
      return sendErrorResponse({
        response,
        statusCode: 404,
        message: 'No monitors found with the given IDs'
      });
    }

    for (const monitor of monitors) {
      await prisma.monitor_checks.deleteMany({
        where: { monitor_id: monitor.id }
      });

      await prisma.incidents.deleteMany({
        where: { monitor_id: monitor.id }
      });

      await prisma.monitors.update({
        where: { id: monitor.id },
        data: {
          workspace_id: monitor.workspace_id,
          name: monitor.name || monitor.url,
          url: monitor.url,
          type: 'http',
          interval_seconds: 60,
          timeout_ms: 5000,
          expected_status: 200,
          check_regions: 'us-east-1,eu-west-1',
          status: 'healthy',
          next_run_at: new Date(Date.now() + 60 * 1000),
          is_active: true,
          consecutive_failures: 0,
          max_retries: 3,
          last_response_time_ms: null,
          last_checked_at: null
        }
      });
    }

    sendSuccessResponse({
      response,
      data: null,
      message: `Statistics reset and monitors reinitialized for ${monitors.length} monitor(s)`
    });
  }
);

/**
 * @route GET /monitors/select
 * @description Get monitors with optional field selection
 * @queryParam {string} [select] - Comma-separated fields to select (e.g. ?select=id,name,url)
 */
export const getMonitorsBySelect: RequestHandler = catchAsync(
  async (request: Request, response: Response) => {
    const selectQuery = request.query.select as string | undefined;

    const allowedFields = [
      'id',
      'name',
      'url',
      'type',
      'created_at',
      'updated_at'
    ] as const;

    let select: Record<string, true> | undefined = undefined;

    if (selectQuery) {
      const fields = selectQuery
        .split(',')
        .map((f) => f.trim())
        .filter((f) => allowedFields.includes(f as any));

      if (fields.length > 0) {
        select = fields.reduce(
          (acc, field) => {
            acc[field] = true;
            return acc;
          },
          {} as Record<string, true>
        );
      }
    }

    const monitors = await prisma.monitors.findMany({
      ...(select && { select }),
      orderBy: { created_at: 'desc' }
    });

    sendSuccessResponse({
      response,
      data: monitors,
      message: 'Monitors fetched successfully'
    });
  }
);
