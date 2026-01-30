import amqp from 'amqplib';
import prisma from '@/prisma';
import logger from '@/utils/logger';
import {
  BaseMonitorCheckResult,
  DnsRecordType,
  KeywordConditionEnum,
  MonitorOverallStatus,
  MonitorsType,
  MonitorTypeEnum
} from '@/types/monitor';
import { env } from '@/configs/env';
import {
  sendIncidentAlertOnEmail,
  sendRecoveryAlertOnEmail
} from '@/services/mailer';
import { AlertServicesEnum, AlertTypesEnum } from '@/types/alert';
import {
  sendFailureAlertOnWhatsApp,
  sendRecoveryAlertOnWhatsApp
} from '@/services/messaging';
import { runDnsMonitor } from '@/services/dnsCheck';
import { runHttpMonitor } from '@/services/httpCheck';
import { runPingMonitor } from '@/services/pingCheck';
import { runPortMonitor } from '@/services/portCheck';
import { runHeartbeatMonitor } from '@/services/heartbeat';
import { createActivityLog } from '@/controllers/activity';
import { sendToProvider } from '@/services/integrations';

export const startWorker = async (): Promise<void> => {
  const queueName = 'monitor_checks_queue';

  logger.info('Worker starting...');

  // --------------------------------------------------
  // STEP 1 — Connect to RabbitMQ
  // --------------------------------------------------
  const connection = await amqp.connect(env.RABBITMQ_URL);
  const channel = await connection.createChannel();
  await channel.assertQueue(queueName, { durable: true });
  channel.prefetch(1);
  logger.info('STEP 1 DONE: Connected to RabbitMQ');

  // --------------------------------------------------
  // STEP 2 — Start listening to queue
  // --------------------------------------------------
  logger.info('STEP 2 DONE: Worker now listening for jobs...');

  channel.consume(queueName, async (message) => {
    if (!message) return;

    try {
      // --------------------------------------------------
      // STEP 3 — Parse job payload
      // --------------------------------------------------
      const payload = JSON.parse(message.content.toString());
      logger.info('STEP 3 DONE: Payload parsed', { monitorId: payload.id });

      // --------------------------------------------------
      // STEP 4 — Fetch Monitor
      // --------------------------------------------------
      const monitor = await prisma.monitors.findUnique({
        where: { id: payload.id }
      });

      if (!monitor) {
        logger.warn('Monitor not found. Acking message.');
        channel.ack(message);
        return;
      }

      logger.info('STEP 4 DONE: Monitor fetched', { monitorId: monitor.id });

      // --------------------------------------------------
      // STEP 5 — Run HTTP Check
      // --------------------------------------------------
      const check = await runMonitorCheck(monitor);

      logger.info('STEP 5 DONE: Monitor check finished', {
        success: check.success,
        type: monitor.type
      });

      // --------------------------------------------------
      // STEP 6 — Save check result in DB
      // --------------------------------------------------
      const checkRecord = await prisma.monitor_checks.create({
        data: {
          monitor_id: monitor.id,
          checked_at: new Date(),
          status: check.status,
          response_body: check.response_body ?? null,
          response_headers: JSON.stringify(check.response_headers) ?? null,
          request_headers: JSON.stringify(check.request_headers) ?? null,
          connect_ms: check.connect_ms ?? null,
          response_size_bytes: check.response_size_bytes ?? null,
          dns_lookup_ms: check.dns_lookup_ms ?? null,
          download_ms: check.download_ms ?? null,
          success: check.success,
          response_time_ms: check.response_time_ms ?? null,
          http_status: check.http_status ?? null,
          error_message: check.error_message ?? null
        }
      });

      logger.info('STEP 6 DONE: Monitor check saved', {
        checkId: checkRecord.id
      });

      // --------------------------------------------------
      // STEP 7 — Incident & Alert
      // --------------------------------------------------

      let activeIncident = await prisma.incidents.findFirst({
        where: { monitor_id: monitor.id, resolved_at: null }
      });

      const previousFailures = monitor.consecutive_failures || 0;
      const failureCount = check.success ? 0 : previousFailures + 1;
      const reachedMaxRetries = failureCount >= monitor.max_retries;

      // ---------- FAILURE SIDE ----------
      if (!check.success) {
        logger.info('STEP 7A: Failure detected', { failureCount });

        // Create new failure incident ONLY once (when reaching max retries)
        if (
          reachedMaxRetries &&
          (!activeIncident ||
            activeIncident.reason !== 'Max retry threshold reached')
        ) {
          activeIncident = await prisma.incidents.create({
            data: {
              monitor_id: monitor.id,
              check_id: checkRecord.id,
              workspace_id: payload.workspace_id,
              started_at: new Date(),
              reason: check.error_message ?? 'Max retry threshold reached'
            }
          });

          await createActivityLog({
            workspace_id: monitor.workspace_id,
            action: 'incident.created',
            entity_type: 'incident',
            entity_id: activeIncident.id,
            message: `Incident created for monitor ${monitor.name ?? monitor.url}`,
            metadata: { monitor_id: monitor.id }
          });

          logger.info('Incident created', { incidentId: activeIncident.id });

          // ---- Send FAILURE Alert ----
          const channels = await prisma.alert_channels.findMany({
            where: {
              workspace_id: monitor.workspace_id,
              monitors: { some: { monitor_id: monitor.id } }
            }
          });

          for (const channel of channels) {
            if (channel.type === AlertServicesEnum.EMAIL) {
              // await sendIncidentAlertOnEmail(
              //   channel.destination,
              //   monitor.url,
              //   activeIncident.started_at
              // );

              await createActivityLog({
                workspace_id: monitor.workspace_id,
                action: 'alert.email_sent',
                entity_type: 'alert',
                entity_id: activeIncident.id,
                message: `Incident alert email sent to ${JSON.parse(channel.destination)?.email}`,
                metadata: { monitor_id: monitor.id, channel_id: channel.id }
              });
            }

            if (channel.type === AlertServicesEnum.WHATSAPP) {
              // sendFailureAlertOnWhatsApp(channel.destination, `Monitor DOWN: ${monitor.url}`, activeIncident.started_at);
            }

            if (
              channel.type !== AlertServicesEnum.EMAIL &&
              channel.type !== AlertServicesEnum.SMS
            ) {
              // try {
              //   const credentials = JSON.parse(channel.destination);
              //   await sendToProvider({
              //     providerId: channel.type,
              //     credentials,
              //     event: 'failure',
              //     message: `Monitor DOWN: ${monitor.url}`
              //   });
              //   await createActivityLog({
              //     workspace_id: monitor.workspace_id,
              //     action: 'alert.integration_sent',
              //     entity_type: 'alert',
              //     entity_id: activeIncident.id,
              //     message: `Failure alert sent to integration provider ${credentials.provider_id}`,
              //     metadata: { monitor_id: monitor.id, channel_id: channel.id }
              //   });
              // } catch (err) {
              //   logger.error('Failed to send alert to integration channel', {
              //     error: err
              //   });
              // }
            }

            await prisma.alerts_sent.create({
              data: {
                monitor_id: monitor.id,
                channel_id: channel.id,
                incident_id: activeIncident.id,
                alert_type: AlertTypesEnum.FAILURE,
                sent_at: new Date(),
                message: `Monitor DOWN: ${monitor.url}`
              }
            });
          }

          logger.info('STEP 7A DONE: Failure alert sent');
        }
      }

      // ---------- SLOW RESPONSE SIDE ----------
      if (monitor.slow_response_alert) {
        const slowThreshold = monitor.slow_response_threshold_ms ?? 2000;

        const isSlow =
          check.response_time_ms != null &&
          check.response_time_ms > slowThreshold;

        if (isSlow) {
          logger.info('STEP 7C: Slow response detected', {
            responseTime: check.response_time_ms,
            threshold: slowThreshold
          });

          // Only create a slow response incident if one doesn't exist or is not for slow response
          if (
            !activeIncident ||
            activeIncident.reason !== 'Slow response time'
          ) {
            activeIncident = await prisma.incidents.create({
              data: {
                monitor_id: monitor.id,
                check_id: checkRecord.id,
                workspace_id: payload.workspace_id,
                started_at: new Date(),
                reason: `Slow response time: ${check.response_time_ms}ms (threshold: ${slowThreshold}ms)`
              }
            });

            await createActivityLog({
              workspace_id: monitor.workspace_id,
              action: 'incident.created',
              entity_type: 'incident',
              entity_id: activeIncident.id,
              message: `Slow response incident created for monitor ${monitor.name ?? monitor.url}`,
              metadata: { monitor_id: monitor.id }
            });

            logger.info('Slow response incident created', {
              incidentId: activeIncident.id
            });

            // ---- Send SLOW RESPONSE Alert ----
            const channels = await prisma.alert_channels.findMany({
              where: {
                workspace_id: monitor.workspace_id,
                monitors: { some: { monitor_id: monitor.id } }
              }
            });

            for (const channel of channels) {
              if (channel.type === AlertServicesEnum.EMAIL) {
                await createActivityLog({
                  workspace_id: monitor.workspace_id,
                  action: 'alert.email_sent',
                  entity_type: 'alert',
                  entity_id: activeIncident.id,
                  message: `Slow response alert email sent to ${JSON.parse(channel.destination)?.email}`,
                  metadata: { monitor_id: monitor.id, channel_id: channel.id }
                });
              }

              await prisma.alerts_sent.create({
                data: {
                  monitor_id: monitor.id,
                  channel_id: channel.id,
                  incident_id: activeIncident.id,
                  alert_type: AlertTypesEnum.FAILURE,
                  sent_at: new Date(),
                  message: `Monitor slow response: ${check.response_time_ms}ms (threshold: ${slowThreshold}ms)`
                }
              });
            }

            logger.info('STEP 7C DONE: Slow response alert sent');
          }
        }
      }

      // ---------- RECOVERY SIDE ----------
      if (check.success && activeIncident) {
        logger.info('STEP 7B: Recovery detected', {
          incidentId: activeIncident.id
        });

        const resolvedAt = new Date();
        const durationSeconds = Math.floor(
          (resolvedAt.getTime() - activeIncident.started_at.getTime()) / 1000
        );

        await prisma.incidents.update({
          where: { id: activeIncident.id },
          data: {
            resolved_at: resolvedAt,
            duration_seconds: durationSeconds,
            resolved_check_id: checkRecord.id
          }
        });

        // ---- Send RECOVERY Alert ----
        const channels = await prisma.alert_channels.findMany({
          where: {
            workspace_id: monitor.workspace_id,
            monitors: { some: { monitor_id: monitor.id } }
          }
        });

        for (const channel of channels) {
          if (channel.type === AlertServicesEnum.EMAIL) {
            // await sendRecoveryAlertOnEmail(
            //   channel.destination,
            //   monitor.url,
            //   resolvedAt
            // );

            await createActivityLog({
              workspace_id: monitor.workspace_id,
              action: 'alert.recovery_email_sent',
              entity_type: 'alert',
              entity_id: activeIncident.id,
              message: `Recovery alert email sent to ${JSON.parse(channel.destination)?.email}`,
              metadata: { monitor_id: monitor.id, channel_id: channel.id }
            });
          }

          if (channel.type === AlertServicesEnum.WHATSAPP) {
            // sendRecoveryAlertOnWhatsApp(channel.destination, `Monitor RECOVERED: ${monitor.url}`, resolvedAt);
          }

          // if (
          //   channel.type !== AlertServicesEnum.EMAIL &&
          //   channel.type !== AlertServicesEnum.SMS
          // ) {
          //   try {
          //     const credentials = JSON.parse(channel.destination);
          //     await sendToProvider({
          //       providerId: channel.type,
          //       credentials,
          //       event: 'recovery',
          //       message: `Monitor RECOVERED: ${monitor.url}`
          //     });

          //     await createActivityLog({
          //       workspace_id: monitor.workspace_id,
          //       action: 'alert.integration_sent',
          //       entity_type: 'alert',
          //       entity_id: activeIncident.id,
          //       message: `Recovery alert sent to integration provider ${credentials.provider_id}`,
          //       metadata: { monitor_id: monitor.id, channel_id: channel.id }
          //     });
          //   } catch (err) {
          //     logger.error(
          //       'Failed to send recovery alert to integration channel',
          //       { error: err }
          //     );
          //   }
          // }

          await prisma.alerts_sent.create({
            data: {
              monitor_id: monitor.id,
              channel_id: channel.id,
              incident_id: activeIncident.id,
              alert_type: AlertTypesEnum.RECOVERY,
              sent_at: new Date(),
              message: `Monitor RECOVERED: ${monitor.url}`
            }
          });
        }

        logger.info('STEP 7B DONE: Recovery alert sent');
      }

      // --------------------------------------------------
      // STEP 8 — Update monitor status
      // --------------------------------------------------
      await prisma.monitors.update({
        where: { id: monitor.id },
        data: {
          consecutive_failures: check.success ? 0 : failureCount,
          last_response_time_ms: check.response_time_ms ?? null,
          last_checked_at:
            monitor.type === MonitorTypeEnum.HEARTBEAT
              ? monitor.last_checked_at
              : new Date(),
          status: check.success
            ? MonitorOverallStatus.HEALTHY
            : MonitorOverallStatus.UNHEALTHY
        }
      });

      logger.info('STEP 8 DONE: Monitor updated');

      // --------------------------------------------------
      // STEP 9 — Ack message
      // --------------------------------------------------
      channel.ack(message);
      logger.info('STEP 9 DONE: Message acknowledged');
    } catch (err) {
      logger.error('Worker error — NACKing message', { error: err });
      channel.nack(message, false, true);
    }
  });
};

export const runMonitorCheck = async (
  monitor: MonitorsType
): Promise<BaseMonitorCheckResult> => {
  switch (monitor.type) {
    case MonitorTypeEnum.HTTP:
      return runHttpMonitor({
        url: monitor.url!,
        timeout_ms: monitor.timeout_ms,
        expected_status: monitor.expected_status,
        headers: JSON.parse(monitor?.headers as unknown as string)
      });

    case MonitorTypeEnum.HEARTBEAT:
      return runHeartbeatMonitor({
        interval_seconds: monitor.interval_seconds,
        ...(monitor.last_checked_at
          ? { last_heartbeat: monitor.last_checked_at.getTime() }
          : {}),
        grace_period_seconds: monitor.grace_period ?? 0
      });

    case MonitorTypeEnum.KEYWORD:
      return runHttpMonitor({
        url: monitor.url!,
        timeout_ms: monitor.timeout_ms,
        keyword: monitor.keyword as string,
        keyword_match_type: monitor.keyword_match_type as KeywordConditionEnum,
        expected_status: monitor.expected_status
      });

    case MonitorTypeEnum.AI_SYNTHETIC:
      return runHttpMonitor({
        url: monitor.url!,
        timeout_ms: monitor.timeout_ms,
        keyword: monitor.keyword as string,
        keyword_match_type: monitor.keyword_match_type as KeywordConditionEnum,
        expected_status: monitor.expected_status
      });

    case MonitorTypeEnum.AI_HEALTH_CHECK:
      return runHttpMonitor({
        url: monitor.url!,
        timeout_ms: monitor.timeout_ms,
        expected_status: monitor.expected_status
      });

    case MonitorTypeEnum.PING:
      return runPingMonitor({
        host: monitor.url!,
        timeout_ms: monitor.timeout_ms
      });

    case MonitorTypeEnum.DNS:
      return runDnsMonitor({
        hostname: monitor.url!,
        records: monitor.records as DnsRecordType[]
      });

    case MonitorTypeEnum.PORT:
      return runPortMonitor({
        host: monitor.url!,
        port: monitor.port!,
        timeout_ms: monitor.timeout_ms
      });

    default:
      throw new Error(`Unsupported monitor type: ${monitor.type}`);
  }
};
