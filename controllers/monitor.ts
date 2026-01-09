import prisma from '@/prisma';
import {
  sendErrorResponse,
  sendSuccessResponse
} from '@/utils/responseHandler';
import { catchAsync } from '@/middlewares/error';
import type { Request, RequestHandler, Response } from 'express';
import {
  CreateMonitorSchemaType,
  MonitorNotifyEventEnum,
  MonitorOverallStatus,
  MonitorTypeEnum,
  UpdateMonitorSchemaType
} from '@/types/monitor';
import { AlertServicesEnum } from '@/types/alert';
import {
  getDomainExpiryDate,
  getSSLCertificateExpiry
} from '@/services/domainSSLMonitor';

/**
 * @route POST /monitors
 * @description Create a new HTTP monitor
 */
export const createNewMonitor: RequestHandler = catchAsync(
  async (request: Request, response: Response) => {
    const payloads = request.body as CreateMonitorSchemaType;

    try {
      const createdMonitorId = await prisma.$transaction(
        async (tx) => {
          const workspaceId = payloads?.[0]?.workspace_id!;

          const allTagNames = [
            ...new Set(payloads.flatMap((p) => p.tags ?? []))
          ];

          if (allTagNames.length) {
            const existingTags = await tx.tags.findMany({
              where: {
                workspace_id: workspaceId,
                name: { in: allTagNames }
              },
              select: { id: true, name: true }
            });

            const existingTagNames = new Set(existingTags.map((t) => t.name));

            const missingTags = allTagNames.filter(
              (name) => !existingTagNames.has(name)
            );

            if (missingTags.length) {
              await tx.tags.createMany({
                data: missingTags.map((name) => ({
                  workspace_id: workspaceId,
                  name
                }))
              });
            }
          }

          const monitors = await Promise.all(
            payloads.map(async (payload) => {
              const monitor = await tx.monitors.create({
                data: {
                  workspace_id: payload?.workspace_id,
                  name: payload?.name || payload?.url!,
                  url: payload?.url,
                  type: payload?.type,
                  interval_seconds: payload?.interval_seconds || 60,
                  timeout_ms: payload.timeout_ms || 5000,
                  records: payload?.records ?? [],
                  port: payload?.port || null,
                  check_ssl_errors: payload?.check_ssl_errors || false,
                  domain_expiry_reminders:
                    payload?.domain_expiry_reminders || false,
                  ssl_expiry_reminders: payload?.ssl_expiry_reminders || false,
                  grace_period: payload?.grace_period || 300,
                  keyword_match_type: payload?.keyword_match_type || null,
                  keyword: payload?.keyword || null,
                  expected_status: [200],
                  check_regions: 'us-east-1',
                  status: MonitorOverallStatus.PREPARING,
                  next_run_at: new Date(
                    Date.now() + (payload?.interval_seconds || 60) * 1000
                  ),
                  is_active: true,
                  consecutive_failures: 0,
                  max_retries: 0,
                  ...(payload?.tags?.length
                    ? {
                        tags: {
                          create: [...new Set(payload.tags)].map((tagName) => ({
                            tag: {
                              connect: {
                                workspace_id_name: {
                                  workspace_id: payload.workspace_id,
                                  name: tagName
                                }
                              }
                            }
                          }))
                        }
                      }
                    : {})
                },
                select: { id: true }
              });

              return monitor;
            })
          );

          const alertRecipients = payloads
            .flatMap((p) => p.alert_channels ?? [])
            .filter(Boolean);

          for (const recipient of alertRecipients) {
            if (recipient.email) {
              await tx.alert_rules.upsert({
                where: {
                  workspace_id_alert_type: {
                    workspace_id: workspaceId,
                    alert_type: AlertServicesEnum.EMAIL
                  }
                },
                update: {
                  enabled: true,
                  events: [
                    MonitorNotifyEventEnum.UP,
                    MonitorNotifyEventEnum.DOWN
                  ]
                },
                create: {
                  workspace_id: workspaceId,
                  alert_type: AlertServicesEnum.EMAIL,
                  enabled: true,
                  events: [
                    MonitorNotifyEventEnum.UP,
                    MonitorNotifyEventEnum.DOWN
                  ]
                }
              });

              await tx.alert_channels.upsert({
                where: {
                  workspace_id_type_destination: {
                    workspace_id: workspaceId,
                    type: AlertServicesEnum.EMAIL,
                    destination: JSON.stringify({ email: recipient.email })
                  }
                },
                update: {},
                create: {
                  workspace_id: workspaceId,
                  type: AlertServicesEnum.EMAIL,
                  destination: JSON.stringify({ email: recipient.email })
                }
              });
            }

            if (recipient.number) {
              await tx.alert_rules.upsert({
                where: {
                  workspace_id_alert_type: {
                    workspace_id: workspaceId,
                    alert_type: AlertServicesEnum.SMS
                  }
                },
                update: {
                  enabled: true,
                  events: [
                    MonitorNotifyEventEnum.UP,
                    MonitorNotifyEventEnum.DOWN
                  ]
                },
                create: {
                  workspace_id: workspaceId,
                  alert_type: AlertServicesEnum.SMS,
                  enabled: true,
                  events: [
                    MonitorNotifyEventEnum.UP,
                    MonitorNotifyEventEnum.DOWN
                  ]
                }
              });

              await tx.alert_channels.upsert({
                where: {
                  workspace_id_type_destination: {
                    workspace_id: workspaceId,
                    type: AlertServicesEnum.SMS,
                    destination: JSON.stringify({ number: recipient.number })
                  }
                },
                update: {},
                create: {
                  workspace_id: workspaceId,
                  type: AlertServicesEnum.SMS,
                  destination: JSON.stringify({ number: recipient.number })
                }
              });
            }
          }

          return payloads.length === 1 ? monitors[0]?.id : null;
        },
        { timeout: 20000 }
      );

      sendSuccessResponse({
        response,
        data: { id: createdMonitorId },
        message: 'Monitors created successfully'
      });
    } catch (error) {
      sendErrorResponse({
        response,
        message: 'Failed to create monitors'
      });
    }
  }
);

/**
 * @route GET /workspaces/:workspaceId/monitors
 * @description Fetch paginated list of monitors in a workspace
 * @queryParam {number} [page=1]
 * @queryParam {number} [limit=10]
 * @queryParam {string} [type] - Monitor type filter
 */
export const getWorkspaceMonitors: RequestHandler = catchAsync(
  async (request: Request, response: Response) => {
    const page = parseInt(request.query.page as string) || 1;
    const limit = parseInt(request.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const { workspaceId } = request.params;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace ID is required'
      });
    }

    const data = await prisma.monitors.findMany({
      where: {
        workspace_id: workspaceId
      },
      skip,
      take: limit,
      include: {
        tags: {
          select: {
            tag: {
              select: { id: true, name: true }
            }
          }
        },
        checks: {
          take: 20,
          orderBy: { checked_at: 'desc' },
          where: {
            checked_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          },
          select: { id: true, checked_at: true, success: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const monitors = data.map((monitor) => ({
      ...monitor,
      tags: monitor.tags.map((tag) => tag.tag)
    }));

    sendSuccessResponse({
      response,
      data: monitors,
      message: 'Monitors fetched successfully'
    });
  }
);

/**
 * @route GET /monitors/:id
 * @description Fetch monitor details by ID including recent checks
 */
export const getMonitorById: RequestHandler = catchAsync(
  async (request: Request, response: Response) => {
    const { id } = request.params;

    if (!id) {
      return sendErrorResponse({
        response,
        message: 'Monitor ID is required'
      });
    }

    const data = await prisma.monitors.findUnique({
      where: { id },
      include: {
        status_pages: { select: { name: true, id: true } },
        tags: {
          select: {
            tag: {
              select: { id: true, name: true }
            }
          }
        },
        checks: {
          where: {
            checked_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          },
          take: 25,
          orderBy: { checked_at: 'desc' }
        }
      }
    });

    if (!data) {
      return sendErrorResponse({
        response,
        statusCode: 404,
        message: 'Monitor not found'
      });
    }

    const monitor = {
      ...data,
      tags: data.tags.map((tag) => tag.tag)
    };

    sendSuccessResponse({
      response,
      data: monitor,
      message: 'Monitor fetched successfully'
    });
  }
);

/**
 * @description Fetch monitors due for checking (next_run_at <= now)
 */
export const fetchAndLockDueMonitors = async () => {
  const now = new Date();

  const dueMonitors = await prisma.monitors.findMany({
    where: {
      next_run_at: { lte: now },
      is_active: true,
      status: { not: MonitorOverallStatus.PAUSED }
    },
    take: 50
  });

  const locked: typeof dueMonitors = [];

  for (const monitor of dueMonitors) {
    const updated = await prisma.monitors.updateMany({
      where: {
        id: monitor.id,
        next_run_at: { lte: now }
      },
      data: {
        next_run_at: new Date(Date.now() + monitor.interval_seconds * 1000)
      }
    });

    if (updated.count === 1) {
      locked.push(monitor);
    }
  }

  return locked;
};

/**
 * @route PATCH /monitors/:id
 * @description Update monitor by ID
 */
export const updateMonitorById: RequestHandler = catchAsync(
  async (request, response) => {
    const { id } = request.params;
    const payload = request.body as Partial<UpdateMonitorSchemaType>;

    if (!id) {
      return sendErrorResponse({
        response,
        message: 'Monitor ID is required'
      });
    }

    const allowedFields: (keyof UpdateMonitorSchemaType)[] = [
      'url',
      'interval_seconds',
      'timeout_ms',
      'expected_status',
      'grace_period',
      'records',
      'keyword',
      'keyword_match_type',
      'name',
      'port',
      'check_regions',
      'ssl_expiry_reminders',
      'alert_channels',
      'domain_expiry_reminders',
      'check_ssl_errors',
      'status',
      'is_active'
    ];

    const updateData: Record<string, any> = {};

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

    await prisma.$transaction(async (tx) => {
      const monitor = await tx.monitors.findUnique({
        where: { id },
        select: { workspace_id: true }
      });

      if (!monitor) {
        throw new Error('Monitor not found');
      }

      const workspaceId = monitor.workspace_id;

      if (payload.tags !== undefined) {
        await tx.monitor_tags.deleteMany({
          where: { monitor_id: id }
        });

        if (payload.tags.length > 0) {
          const existingTags = await tx.tags.findMany({
            where: {
              workspace_id: workspaceId,
              name: { in: payload.tags }
            }
          });

          const tagMap = new Map(existingTags.map((t) => [t.name, t.id]));
          const missing = payload.tags.filter((t) => !tagMap.has(t));

          if (missing.length) {
            await tx.tags.createMany({
              data: missing.map((name) => ({
                name,
                workspace_id: workspaceId
              }))
            });

            const created = await tx.tags.findMany({
              where: {
                workspace_id: workspaceId,
                name: { in: missing }
              }
            });

            created.forEach((t) => tagMap.set(t.name, t.id));
          }

          await tx.monitor_tags.createMany({
            data: payload.tags.map((tag) => ({
              monitor_id: id,
              tag_id: tagMap.get(tag)!
            }))
          });
        }
      }

      if (payload?.alert_channels?.length) {
        for (const recipient of payload.alert_channels) {
          if (recipient.email) {
            await tx.alert_rules.upsert({
              where: {
                workspace_id_alert_type: {
                  workspace_id: workspaceId,
                  alert_type: AlertServicesEnum.EMAIL
                }
              },
              update: {
                enabled: true,
                events: [MonitorNotifyEventEnum.UP, MonitorNotifyEventEnum.DOWN]
              },
              create: {
                workspace_id: workspaceId,
                alert_type: AlertServicesEnum.EMAIL,
                enabled: true,
                events: [MonitorNotifyEventEnum.UP, MonitorNotifyEventEnum.DOWN]
              }
            });

            await tx.alert_channels.upsert({
              where: {
                workspace_id_type_destination: {
                  workspace_id: workspaceId,
                  type: AlertServicesEnum.EMAIL,
                  destination: JSON.stringify({
                    email: recipient.email
                  })
                }
              },
              update: {},
              create: {
                workspace_id: workspaceId,
                type: AlertServicesEnum.EMAIL,
                destination: JSON.stringify({
                  email: recipient.email
                })
              }
            });
          }

          if (recipient.number) {
            await tx.alert_rules.upsert({
              where: {
                workspace_id_alert_type: {
                  workspace_id: workspaceId,
                  alert_type: AlertServicesEnum.SMS
                }
              },
              update: {
                enabled: true,
                events: [MonitorNotifyEventEnum.UP, MonitorNotifyEventEnum.DOWN]
              },
              create: {
                workspace_id: workspaceId,
                alert_type: AlertServicesEnum.SMS,
                enabled: true,
                events: [MonitorNotifyEventEnum.UP, MonitorNotifyEventEnum.DOWN]
              }
            });

            await tx.alert_channels.upsert({
              where: {
                workspace_id_type_destination: {
                  workspace_id: workspaceId,
                  type: AlertServicesEnum.SMS,
                  destination: JSON.stringify({
                    number: recipient.number
                  })
                }
              },
              update: {},
              create: {
                workspace_id: workspaceId,
                type: AlertServicesEnum.SMS,
                destination: JSON.stringify({
                  number: recipient.number
                })
              }
            });
          }
        }
      }

      await tx.monitors.update({
        where: { id },
        data: updateData
      });
    });

    sendSuccessResponse({
      response,
      data: null,
      message: 'Monitor updated successfully'
    });
  }
);

/**
 * @route DELETE /monitors
 * @description Delete multiple monitors by IDs along with their related alerts, checks, and incidents
 */
export const deleteMonitors: RequestHandler = catchAsync(
  async (request: Request, response: Response) => {
    const { ids } = request.body as { ids: string[] };

    await prisma.$transaction([
      prisma.alerts_sent.deleteMany({ where: { monitor_id: { in: ids } } }),
      prisma.incidents.deleteMany({ where: { monitor_id: { in: ids } } }),
      prisma.monitor_checks.deleteMany({ where: { monitor_id: { in: ids } } }),
      prisma.monitors.deleteMany({ where: { id: { in: ids } } })
    ]);

    sendSuccessResponse({
      response,
      data: null,
      message: `${ids.length} monitor(s) deleted successfully`
    });
  }
);

/**
 * @route POST /monitors/reset-stats
 * @description Bulk reset monitors to initial state and delete all stats
 */
export const resetMonitorStats: RequestHandler = catchAsync(
  async (request: Request, response: Response) => {
    const { ids } = request.body as { ids: string[] };

    const monitors = await prisma.monitors.findMany({
      where: { id: { in: ids } }
    });

    if (monitors.length === 0) {
      return sendErrorResponse({
        response,
        statusCode: 404,
        message: 'No monitors found with the given IDs'
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const monitor of monitors) {
        await tx.monitor_checks.deleteMany({
          where: { monitor_id: monitor.id }
        });

        await tx.incidents.deleteMany({
          where: { monitor_id: monitor.id }
        });

        await tx.monitor_tags.deleteMany({
          where: { monitor_id: monitor.id }
        });

        await tx.monitors.update({
          where: { id: monitor.id },
          data: {
            workspace_id: monitor.workspace_id,
            name: monitor.name || (monitor.url as string),
            url: monitor.url,
            type: monitor.type,
            keyword: monitor.keyword,
            keyword_match_type: monitor.keyword_match_type,
            grace_period: monitor.grace_period,
            port: monitor.port,
            interval_seconds: monitor.interval_seconds || 60,
            timeout_ms: monitor.timeout_ms || 5000,
            expected_status: monitor.expected_status,
            check_regions: monitor.check_regions,
            status: MonitorOverallStatus.HEALTHY,
            next_run_at: new Date(Date.now() + 60 * 1000),
            is_active: true,
            consecutive_failures: 0,
            max_retries: 0,
            last_response_time_ms: null,
            last_checked_at: null
          }
        });
      }
    });

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
    const selectQuery = request.query.select as string;

    const allowedFields = [
      'id',
      'name',
      'url',
      'type',
      'created_at',
      'updated_at'
    ] as const;

    let select: Record<string, true> | undefined;

    if (selectQuery) {
      const fields = selectQuery
        .split(',')
        .map((field) => field.trim())
        .filter((field) => allowedFields.includes(field as any));

      if (fields.length > 0) {
        select = fields.reduce(
          (acc, field) => ({ ...acc, [field]: true }),
          {} as Record<string, true>
        );
      }
    }

    const monitors = await prisma.monitors.findMany({
      ...(select && { select }),
      orderBy: { created_at: 'desc' },
      where: {
        type: MonitorTypeEnum.HTTP
      }
    });

    sendSuccessResponse({
      response,
      data: monitors,
      message: 'Monitors fetched successfully'
    });
  }
);

/**
 * @route GET /monitors/checks
 * @description Fetch checks for a monitor within a start and end date
 * @queryParam {string} start - Start date in ISO format (required)
 * @queryParam {string} end - End date in ISO format (required)
 */
export const getChecks: RequestHandler = catchAsync(
  async (request, response) => {
    const { start, end } = request.query;

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

    const checks = await prisma.monitor_checks.findMany({
      where: {
        monitor: {
          type: {
            not: MonitorTypeEnum.HEARTBEAT
          },
          is_active: true
        },
        created_at: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { created_at: 'desc' }
    });

    sendSuccessResponse({
      response,
      data: checks,
      message: checks.length
        ? `Fetched ${checks.length} check(s) successfully`
        : 'No checks found for the given criteria'
    });
  }
);

/**
 * @route POST /monitors/:monitorId/heartbeat
 * @description Update last_checked_at for a heartbeat monitor
 * @param {string} monitorId - Monitor ID in the URL path
 */
export const updateHeartbeat: RequestHandler = catchAsync(
  async (request, response) => {
    const monitorId = request.params?.monitorId;

    if (!monitorId) {
      return sendErrorResponse({
        response: response,
        message: 'Monitor Id is required'
      });
    }

    const monitor = await prisma.monitors.findUnique({
      where: { id: monitorId }
    });

    if (!monitor) {
      return sendErrorResponse({
        response: response,
        message: 'Monitor not found'
      });
    }

    if (!monitor.is_active) {
      return sendErrorResponse({
        response: response,
        message: 'Monitor is not active'
      });
    }

    if (monitor.type !== MonitorTypeEnum.HEARTBEAT) {
      return sendErrorResponse({
        response: response,
        message: 'Monitor is not of type HEARTBEAT'
      });
    }

    await prisma.monitors.update({
      where: { id: monitorId },
      data: { last_checked_at: new Date() }
    });

    sendSuccessResponse({
      response,
      data: null,
      message: 'Heartbeat updated successfully'
    });
  }
); /**
 * @route GET /monitors/:id/domain-ssl
 * @description Get domain & SSL expiry information for a monitor
 */
export const getDomainAndSSL: RequestHandler = catchAsync(
  async (request, response) => {
    const monitorId = request.params?.id;

    if (!monitorId) {
      return sendErrorResponse({
        response,
        message: 'Monitor Id is required'
      });
    }

    const monitor = await prisma.monitors.findUnique({
      where: { id: monitorId }
    });

    if (!monitor) {
      return sendErrorResponse({
        response,
        message: 'Monitor not found'
      });
    }

    if (!monitor.is_active) {
      return sendErrorResponse({
        response,
        message: 'Monitor is not active'
      });
    }

    if (!monitor.url) {
      return sendErrorResponse({
        response,
        message: 'Monitor does not have a valid URL'
      });
    }

    let hostname: string;

    try {
      const parsedUrl = new URL(
        monitor.url.startsWith('http') ? monitor.url : `https://${monitor.url}`
      );

      hostname = parsedUrl.hostname.toLowerCase();
    } catch {
      return sendErrorResponse({
        response,
        message: 'Invalid URL format'
      });
    }

    hostname = hostname.replace(/^www\./, '');

    const isValidDomain = /^[a-z0-9-]+\.[a-z]{2,}$/i.test(hostname);

    if (!isValidDomain) {
      return sendErrorResponse({
        response,
        message: 'Domain must be a valid root domain (example.com)'
      });
    }

    const [domainExpiry, sslExpiry] = await Promise.all([
      getDomainExpiryDate(hostname),
      getSSLCertificateExpiry(hostname)
    ]);

    sendSuccessResponse({
      response,
      data: {
        domain: hostname,
        domain_expiry_date: domainExpiry ? domainExpiry.toISOString() : null,
        ssl_valid_until: sslExpiry ? sslExpiry.toISOString() : null
      },
      message: 'Domain and SSL details fetched successfully'
    });
  }
);
