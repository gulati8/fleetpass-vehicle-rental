import { LoggerOptions } from 'pino';

export const getLoggerConfig = (): LoggerOptions => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

    // Development: pretty print for readability
    // Production: JSON for log aggregation
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined,

    // Add base fields to all logs
    base: {
      env: process.env.NODE_ENV || 'development',
      service: 'fleetpass-backend',
    },

    // Serialize errors properly
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers['user-agent'],
        },
        remoteAddress: req.remoteAddress,
        remotePort: req.remotePort,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
      err: (err) => ({
        type: err.constructor.name,
        message: err.message,
        stack: err.stack,
      }),
    },

    // Format timestamps
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
  };
};
