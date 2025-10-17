import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchService } from './match.service';
import { MatchGateway } from './match.gateway';
import { MediasoupModule } from '../mediasoup/mediasoup.module';
import { Match } from './entities/match.entity';
import { MatchUser } from './entities/match-user.entity';
import { User } from 'src/users/entities/user.entity';
import { RedisModule } from 'src/redis/redis.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, MatchUser, User]),
    RedisModule,
    forwardRef(() => MediasoupModule), // MediasoupModule을 먼저 import하여 MediasoupService가 먼저 초기화됨
    UsersModule,
  ],
  controllers: [],
  providers: [MatchService, MatchGateway],
  exports: [MatchService],
})
export class MatchModule {}
