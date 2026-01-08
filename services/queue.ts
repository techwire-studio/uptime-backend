import { env } from '@/configs/env';
import { MonitorsType } from '@/types/monitor';
import logger from '@/utils/logger';
import amqplib, { type ChannelModel, type Channel } from 'amqplib';

let connectionInstance: ChannelModel | undefined;
let channelInstance: Channel | undefined;

const initializeQueue = async (): Promise<Channel> => {
  if (channelInstance) return channelInstance;

  try {
    connectionInstance = await amqplib.connect(env.RABBITMQ_URL);
    channelInstance = await connectionInstance.createChannel();

    await channelInstance.assertQueue('monitor_checks_queue', {
      durable: true
    });

    logger.info('RabbitMQ sender connected');
    return channelInstance;
  } catch (error) {
    logger.error('Failed to initialize RabbitMQ queue:', error);
    throw error;
  }
};

export const sendToQueue = async (
  monitorList: MonitorsType[]
): Promise<void> => {
  const channel = await initializeQueue();

  for (const monitor of monitorList) {
    channel.sendToQueue(
      'monitor_checks_queue',
      Buffer.from(JSON.stringify(monitor)),
      { persistent: true }
    );
  }

  logger.info(`Queued ${monitorList.length} monitor checks`);
};
