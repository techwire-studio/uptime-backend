import winston from 'winston';

const { combine, timestamp, printf, colorize, align } = winston.format;

winston.addColors({
  fatal: 'red bold',
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  trace: 'gray'
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD hh:mm:ss.SSS A' }),
    align(),
    printf((info) => {
      const { timestamp, level, message, ...meta } = info;
      const metaString = Object.keys(meta).length
        ? `\n${JSON.stringify(meta, null, 2)}`
        : '';
      return `[${timestamp}] ${level}: ${message}${metaString}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

export default logger;
