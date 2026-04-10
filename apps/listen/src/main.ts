import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { ListenModule } from './listen.module';
import { winstonConfig } from '@app/common/logger';

async function bootstrap() {
  const app = await NestFactory.create(ListenModule, {
    logger: WinstonModule.createLogger(winstonConfig)
  });
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
