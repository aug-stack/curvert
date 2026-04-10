import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/common/redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule.forRoot({
      host: process.env.CACHE_HOST,
      password: process.env.CACHE_PASSWORD,
      port: Number(process.env.CACHE_PORT ?? 6379),
      maxRetries: 20
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
