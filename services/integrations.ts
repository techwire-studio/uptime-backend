import { env } from '@/configs/env';
import axios from 'axios';

type Credentials = {
  webhook_url: string;
  chat_id: string;
  custom_headers: string;
  bot_token: string;
  user_key: string;
  access_token: string;
  integration_key: string;
};

type ProviderSender = (args: {
  credentials: Credentials;
  event: string;
  message: string;
}) => Promise<void>;

const PROVIDER_SENDERS: Record<string, ProviderSender> = {
  slack: async ({ credentials, message }) => {
    await axios.post(credentials.webhook_url, {
      text: message
    });
  },

  discord: async ({ credentials, message }) => {
    await axios.post(credentials.webhook_url, {
      content: message
    });
  },

  telegram: async ({ credentials, message }) => {
    await axios.post(
      `https://api.telegram.org/bot${credentials.bot_token}/sendMessage`,
      {
        chat_id: credentials.chat_id,
        text: message
      }
    );
  },

  webhook: async ({ credentials, event, message }) => {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (credentials.custom_headers) {
      headers = {
        ...headers,
        ...JSON.parse(credentials.custom_headers)
      };
    }

    await axios.post(
      credentials.webhook_url,
      {
        event,
        message,
        timestamp: new Date().toISOString()
      },
      { headers }
    );
  },

  googlechat: async ({ credentials, message }) => {
    await axios.post(credentials.webhook_url, {
      text: message
    });
  },

  msteams: async ({ credentials, message }) => {
    await axios.post(credentials.webhook_url, {
      text: message
    });
  },

  pushover: async ({ credentials, message }) => {
    await axios.post(
      'https://api.pushover.net/1/messages.json',
      new URLSearchParams({
        token: env.PUSH_OVER_APP_TOKEN,
        user: credentials.user_key,
        message
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
  },

  pushbullet: async ({ credentials, message }) => {
    await axios.post(
      'https://api.pushbullet.com/v2/pushes',
      {
        type: 'note',
        title: 'Notification',
        body: message
      },
      {
        headers: {
          'Access-Token': credentials.access_token,
          'Content-Type': 'application/json'
        }
      }
    );
  },

  mattermost: async ({ credentials, message }) => {
    await axios.post(credentials.webhook_url, {
      text: message
    });
  },

  zapier: async ({ credentials, message }) => {
    await axios.post(credentials.webhook_url, {
      message
    });
  },

  splunk: async ({ credentials, message }) => {
    await axios.post(
      credentials.webhook_url,
      { event: message },
      { headers: { 'Content-Type': 'application/json' } }
    );
  },

  pagerduty: async ({ credentials, message }) => {
    await axios.post(
      'https://events.pagerduty.com/v2/enqueue',
      {
        routing_key: credentials.integration_key,
        event_action: 'trigger',
        payload: {
          summary: message,
          severity: 'info',
          source: 'notification-service'
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};

export async function sendToProvider({
  providerId,
  credentials,
  event,
  message
}: {
  providerId: string;
  credentials: Credentials;
  event: string;
  message: string;
}) {
  const sender = PROVIDER_SENDERS[providerId];

  if (!sender) {
    throw new Error(`No sender registered for provider ${providerId}`);
  }

  await sender({ credentials, event, message });
}
