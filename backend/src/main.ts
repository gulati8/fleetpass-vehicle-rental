import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { getHelmetConfig } from './config/helmet.config';
import { LoggerService } from './common/logger/logger.service';

async function bootstrap() {
  const logger = new LoggerService('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService(),
  });

  // Apply Helmet security headers
  app.use(helmet(getHelmetConfig()));

  // Enable cookie parsing
  app.use(cookieParser());

  // CORS configuration with stricter origin validation
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000', // Development fallback
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 FleetPass API running on http://localhost:${port}/api/v1`);
  logger.log(`🛡️  Security headers enabled (Helmet)`);
  logger.log(`⚡ Rate limiting active (100 req/min global, 5 req/15min auth)`);
  logger.log(`📝 Structured logging enabled (Pino)`);
}

bootstrap().catch((error) => {
  const logger = new LoggerService('Bootstrap');
  logger.error('Failed to start application', error.stack);
  process.exit(1);
});
