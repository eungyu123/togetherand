import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { OnlineStatusMonitorService } from './online-status-monitor.service';
import type { RedisConfig } from '../config/redis.config';

@Module({
  imports: [
    ConfigModule, // Redis 설정을 위해 필요
  ],
  controllers: [],
  providers: [
    RedisService,
    OnlineStatusMonitorService,
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>('redis');
        const Redis = require('ioredis');

        // ===========================================
        // 메인 Redis 클라이언트 (일반 명령어용)
        // ===========================================
        const redisClient = new Redis({
          host: redisConfig!.host,
          port: redisConfig!.port,
          db: redisConfig!.db,
          password: redisConfig!.password,
          tls: redisConfig!.tls ? {} : undefined,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });

        // ===========================================
        // Redis Keyspace Notifications 활성화
        // ===========================================
        try {
          await redisClient.config('SET', 'notify-keyspace-events', 'Ex');
          console.log('✅ Redis Keyspace Notifications 활성화 완료 (E: Keyevent, x: 만료이벤트)');
        } catch (error) {
          console.warn('⚠️ Redis Keyspace Notifications 설정 실패:', error);
          console.warn('   → 통화 요청 타임아웃 알림이 작동하지 않을 수 있습니다.');
        }

        return redisClient;
      },
    },
    {
      provide: 'REDIS_SUBSCRIBER_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>('redis');
        const Redis = require('ioredis');

        // ===========================================
        // 별도 Redis 클라이언트 (Subscriber 전용)
        // ===========================================
        // Keyspace Notifications 구독을 위한 전용 클라이언트
        // 이 클라이언트는 subscriber 모드로 전환되어
        // 일반 Redis 명령어는 사용할 수 없음
        const subscriberClient = new Redis({
          host: redisConfig!.host,
          port: redisConfig!.port,
          db: redisConfig!.db,
          password: redisConfig!.password,
          tls: redisConfig!.tls ? {} : undefined,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });

        console.log('✅ Redis Subscriber 클라이언트 생성 완료');
        return subscriberClient;
      },
    },
  ],
  exports: [RedisService, OnlineStatusMonitorService, 'REDIS_CLIENT', 'REDIS_SUBSCRIBER_CLIENT'],
})
export class RedisModule {}
