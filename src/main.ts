import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  setupApp(app);
  await app.listen(
    Number(process.env.PORT ?? 3000),
    process.env.HOST ?? '127.0.0.1',
  );
}
void bootstrap().catch(() => {
  console.error(
    'API startup failed. Check database and environment configuration.',
  );
  process.exitCode = 1;
});
