import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@app/common/redis';

import { MonobankApiService } from './api/monobank-api.service';
import { ListenService } from './listen.service';
import { ListenController } from './listen.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    RedisModule.forRoot({
      host: process.env.CACHE_HOST,
      password: process.env.CACHE_PASSWORD,
      port: Number(process.env.CACHE_PORT ?? 6379),
      maxRetries: 20
    })
  ],
  controllers: [ListenController],
  providers: [
    MonobankApiService,
    ListenService
  ],
})
export class ListenModule { }
