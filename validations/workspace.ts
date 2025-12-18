import { z } from 'zod';

export const WebhookUrlSchema = z.object({
  webhook_url: z.string().url()
});

const SlackConfigSchema = WebhookUrlSchema;
const DiscordConfigSchema = WebhookUrlSchema;
const GoogleChatConfigSchema = WebhookUrlSchema;
const TeamsConfigSchema = WebhookUrlSchema;

const TelegramConfigSchema = z.object({
  bot_token: z.string().min(1),
  chat_id: z.string().min(1)
});

const WebhookConfigSchema = z.object({
  url: z.string().url(),
  metadata: z.record(z.string(), z.string()).optional()
});

const PagerDutyConfigSchema = z.object({
  routing_key: z.string().min(1)
});

export const createAlertChannelSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('slack'),
    config: SlackConfigSchema
  }),
  z.object({
    type: z.literal('discord'),
    config: DiscordConfigSchema
  }),
  z.object({
    type: z.literal('google_chat'),
    config: GoogleChatConfigSchema
  }),
  z.object({
    type: z.literal('teams'),
    config: TeamsConfigSchema
  }),
  z.object({
    type: z.literal('telegram'),
    config: TelegramConfigSchema
  }),
  z.object({
    type: z.literal('webhook'),
    config: WebhookConfigSchema
  }),
  z.object({
    type: z.literal('pagerduty'),
    config: PagerDutyConfigSchema
  })
]);
