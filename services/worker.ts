import amqp from 'amqplib';
import prisma from '@/prisma';
import { runHttpMonitor } from '@/services/httpCheck';
import logger from '@/utils/logger';
import { MonitorOverallStatus } from '@/types/monitor';
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

export const startWorker = async (): Promise<void> => {
  const queueName = 'monitor_checks_queue';

  logger.info('Worker starting...', { queueName });

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
      const check = await runHttpMonitor({
        url: monitor.url,
        timeout_ms: monitor.timeout_ms,
        expected_status: monitor.expected_status
      });
      logger.info('STEP 5 DONE: HTTP check finished', {
        success: check.success
      });

      // --------------------------------------------------
      // STEP 6 — Save check result in DB
      // --------------------------------------------------
      const checkRecord = await prisma.monitor_checks.create({
        data: {
          monitor_id: monitor.id,
          checked_at: new Date(),
          status: check.status,
          response_body: check.response_body,
          response_headers: JSON.stringify(check.response_headers),
          request_headers: JSON.stringify(check.request_headers),
          connect_ms: check.connect_ms,
          response_size_bytes: check.response_size_bytes,
          dns_lookup_ms: check.dns_lookup_ms,
          download_ms: check.download_ms,
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

        // Create new incident ONLY once (when reaching max retries)
        if (reachedMaxRetries && !activeIncident) {
          activeIncident = await prisma.incidents.create({
            data: {
              monitor_id: monitor.id,
              check_id: checkRecord.id,
              started_at: new Date(),
              reason: check.error_message ?? 'Max retry threshold reached'
            }
          });

          logger.info('Incident created', { incidentId: activeIncident.id });

          // ---- Send FAILURE Alert (ONLY ONCE) ----
          const channels = await prisma.alert_channels.findMany({
            where: { workspace_id: monitor.workspace_id }
          });

          for (const channel of channels) {
            if (channel.type === AlertServicesEnum.EMAIL) {
              // await sendIncidentAlertOnEmail(
              //   channel.destination,
              //   monitor.url,
              //   activeIncident.started_at
              // );
            }

            if (channel.type === AlertServicesEnum.WHATSAPP) {
              // await sendFailureAlertOnWhatsApp(
              //   channel.destination,
              //   `Monitor DOWN: ${monitor.url}`,
              //   activeIncident.started_at
              // );
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

        // ---- Send RECOVERY Alert (ONLY ONCE) ----
        const channels = await prisma.alert_channels.findMany({
          where: { workspace_id: monitor.workspace_id }
        });

        for (const channel of channels) {
          if (channel.type === AlertServicesEnum.EMAIL) {
            // await sendRecoveryAlertOnEmail(
            //   channel.destination,
            //   monitor.url,
            //   resolvedAt
            // );
          }

          if (channel.type === AlertServicesEnum.WHATSAPP) {
            // await sendRecoveryAlertOnWhatsApp(
            //   channel.destination,
            //   `Monitor RECOVERED: ${monitor.url}`,
            //   resolvedAt
            // );
          }

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
          consecutive_failures: reachedMaxRetries ? 0 : failureCount,
          last_response_time_ms: check.response_time_ms ?? null,
          last_checked_at: new Date(),
          next_run_at: new Date(Date.now() + monitor.interval_seconds * 1000),
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
