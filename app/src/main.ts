import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // FIX 5: Fail fast if JWT_SECRET is missing or uses an insecure default value
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('troque')) {
    console.error('FATAL: JWT_SECRET nao configurado ou usa valor padrao inseguro. Abortando.');
    process.exit(1);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const logger = WinstonModule.createLogger({
    level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
    transports: [
      new winston.transports.Console({
        format: isProduction
          ? winston.format.combine(winston.format.timestamp(), winston.format.json())
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp(),
              winston.format.printf(({ level, message, timestamp, context, ...meta }) => {
                const suffix = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} ${level}${context ? ` [${context}]` : ''}: ${typeof message === 'string' ? message : JSON.stringify(message)}${suffix}`;
              }),
            ),
      }),
      new DailyRotateFile({
        filename: 'logs/app-%DATE%.log',
        maxFiles: '14d',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
    ],
  });
  const app = await NestFactory.create(AppModule, {
    logger,
    rawBody: true,
  });

  // Em producao, restringir ao dominio do frontend via FRONTEND_URL env.
  const allowedOrigin = process.env.FRONTEND_URL ?? true;
  app.enableCors({ origin: allowedOrigin, credentials: true });

  // Validacao global de DTO: rejeita campos desconhecidos e converte tipos.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerUser = process.env.SWAGGER_BASIC_USER;
  const swaggerPassword = process.env.SWAGGER_BASIC_PASSWORD;
  const canExposeSwagger = !isProduction || Boolean(swaggerUser && swaggerPassword);

  if (canExposeSwagger) {
    if (isProduction && swaggerUser && swaggerPassword) {
      const swaggerBasicAuth = (
        request: Request,
        response: Response,
        next: NextFunction,
      ) => {
        const header = request.headers.authorization;
        const [scheme, encoded] = header?.split(' ') ?? [];
        const credentials = encoded
          ? Buffer.from(encoded, 'base64').toString('utf8')
          : '';
        const separatorIndex = credentials.indexOf(':');
        const user = credentials.slice(0, separatorIndex);
        const password = credentials.slice(separatorIndex + 1);

        if (scheme === 'Basic' && user === swaggerUser && password === swaggerPassword) {
          next();
          return;
        }

        response.setHeader('WWW-Authenticate', 'Basic realm="Swagger"');
        response.status(401).send('Swagger authentication required');
      };

      app.use('/docs', swaggerBasicAuth);
      app.use('/docs-json', swaggerBasicAuth);
    }

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Cobrança SaaS API')
      .setDescription('API multi-tenant para cobranças, financeiro, CRM e automações WhatsApp.')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT retornado em POST /auth/login.',
        },
        'JWT',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(`API de cobranca rodando em http://localhost:${port}`);
}

void bootstrap();
