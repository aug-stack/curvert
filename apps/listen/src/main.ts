import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { createWinstonConfig } from '@app/common/logger';
import { ListenModule } from './listen.module';

async function bootstrap() {
  const app = await NestFactory.create(ListenModule, {
      logger: WinstonModule.createLogger(createWinstonConfig('listen')),
  });
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
