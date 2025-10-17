// src/mediasoup/mediasoup.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { MediasoupService } from './mediasoup.service';
import { MediasoupGateway } from './mediasoup.gateway';
import { UsersModule } from 'src/users/users.module';
import { RedisModule } from 'src/redis/redis.module';
import { MatchModule } from 'src/match/match.module';

@Module({
  imports: [UsersModule, RedisModule, forwardRef(() => MatchModule)],
  providers: [MediasoupService, MediasoupGateway],
  exports: [MediasoupService, MediasoupGateway],
})
export class MediasoupModule {}
