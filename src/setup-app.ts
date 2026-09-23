import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupApp(app: NestExpressApplication) {
  const production = process.env.NODE_ENV === 'production';
  const express = app.getHttpAdapter().getInstance();
  express.disable('x-powered-by');
  // Configure only when running behind a trusted, single reverse proxy.
  if (process.env.TRUST_PROXY === '1') express.set('trust proxy', 1);
  app.useBodyParser('json', { limit: '32kb' });
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    if (production && req.secure)
      res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    next();
  });
  const origins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (origins.length)
    app.enableCors({
      origin: origins,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  if (!production || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Mercería API')
      .setDescription('Primera versión: administración y operación de mercería')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    // All routes require auth except login and health; show this in Swagger.
    for (const [path, item] of Object.entries(document.paths)) {
      for (const method of ['get', 'post', 'patch', 'delete']) {
        if (item[method])
          item[method].security =
            path === '/auth/login' || path === '/health'
              ? []
              : [{ bearer: [] }];
      }
    }
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: false },
    });
  }
  app.enableShutdownHooks();
}
