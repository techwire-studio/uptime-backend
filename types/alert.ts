export enum AlertTypesEnum {
  RECOVERY = 'recovery',
  FAILURE = 'failure'
}

export enum AlertServicesEnum {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp'
}

export type WhatsappTextMessageType = {
  messaging_product: 'whatsapp';
  preview_url: boolean;
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: {
    body: string;
  };
};
