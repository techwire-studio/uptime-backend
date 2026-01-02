import { z } from 'zod';

const EventsSchema = z
  .array(z.enum(['UP', 'DOWN', 'SSL_EXPIRY', 'DOMAIN_EXPIRY']))
  .min(1, 'At least one event must be selected');

export const WebhookUrlSchema = z.object({
  webhook_url: z.string().trim().url()
});

const SlackConfigSchema = WebhookUrlSchema;
const DiscordConfigSchema = WebhookUrlSchema;
const GoogleChatConfigSchema = WebhookUrlSchema;
const TeamsConfigSchema = WebhookUrlSchema;

const TelegramConfigSchema = z.object({
  bot_token: z.string().trim().min(1),
  chat_id: z.string().trim().min(1)
});

const WebhookConfigSchema = z.object({
  url: z.string().trim().url(),
  metadata: z.record(z.string().trim(), z.string().trim()).optional()
});

const PagerDutyConfigSchema = z.object({
  routing_key: z.string().trim().min(1)
});

export const createAlertChannelSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('slack'),
    config: SlackConfigSchema,
    events: EventsSchema
  }),
  z.object({
    type: z.literal('discord'),
    config: DiscordConfigSchema,
    events: EventsSchema
  }),
  z.object({
    type: z.literal('google_chat'),
    config: GoogleChatConfigSchema,
    events: EventsSchema
  }),
  z.object({
    type: z.literal('teams'),
    config: TeamsConfigSchema,
    events: EventsSchema
  }),
  z.object({
    type: z.literal('telegram'),
    config: TelegramConfigSchema,
    events: EventsSchema
  }),
  z.object({
    type: z.literal('webhook'),
    config: WebhookConfigSchema,
    events: EventsSchema
  }),
  z.object({
    type: z.literal('pagerduty'),
    config: PagerDutyConfigSchema,
    events: EventsSchema
  })
]);

export const updateTagsSchema = z.object({
  monitorId: z.string().trim().min(1),
  addedTags: z.array(z.string().trim().min(1)).default([]),
  removedTags: z.array(z.string().trim().min(1)).default([])
});
