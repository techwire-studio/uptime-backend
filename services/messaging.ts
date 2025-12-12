import { env } from '@/configs/env';
import { WhatsappTextMessageType } from '@/types/alert';
import logger from '@/utils/logger';

const sendMessage = async (data: WhatsappTextMessageType) => {
  const response = await fetch(
    `https://graph.facebook.com/${env.WHATSAPP_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.WHATSAPP_SYSTEM_USER_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
};

const getTextMessageInput = (
  recipient: string,
  text: string
): WhatsappTextMessageType => {
  return {
    messaging_product: 'whatsapp',
    preview_url: false,
    recipient_type: 'individual',
    to: recipient,
    type: 'text',
    text: {
      body: text
    }
  };
};

/**
 * Send a dynamic recovery alert via WhatsApp
 * @param recipient WhatsApp number including country code, e.g. "1234567890"
 * @param title Incident title
 * @param recoveredAt Recovery timestamp
 */
export const sendRecoveryAlertOnWhatsApp = async (
  recipient: string,
  title: string,
  recoveredAt: Date
) => {
  const messageBody = `
Recovery Notification

Title: ${title}
Recovered At: ${recoveredAt}

The incident has been resolved and systems are back to normal.
`;

  const payload = getTextMessageInput(recipient, messageBody);

  try {
    const result = await sendMessage(payload);
    logger.info('WhatsApp message sent successfully for recovery');
    return result;
  } catch (err: any) {
    logger.info('Failed to send WhatsApp message');
    throw new Error('Failed to send WhatsApp message');
  }
};

/**
 * Send a dynamic failure alert via WhatsApp
 * @param recipient WhatsApp number including country code, e.g. "1234567890"
 * @param title Incident title
 * @param occurredAt Failure timestamp
 * @param details Optional additional details about the failure
 */
export const sendFailureAlertOnWhatsApp = async (
  recipient: string,
  title: string,
  occurredAt: Date,
  details?: string
) => {
  const messageBody = `
⚠️ Failure Notification

Title: ${title}
Occurred At: ${occurredAt}
${details ? `Details: ${details}` : ''}

Please check the system immediately to resolve the issue.
`;

  const payload = getTextMessageInput(recipient, messageBody);

  try {
    const result = await sendMessage(payload);
    logger.info('WhatsApp failure alert sent successfully');
    return result;
  } catch (err: any) {
    logger.error('Failed to send WhatsApp failure alert:', err.message || err);
    throw new Error('Failed to send WhatsApp failure alert');
  }
};
