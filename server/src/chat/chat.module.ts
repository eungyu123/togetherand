import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatRoomMember } from './entities/chat-room-member.entity';
import { User } from '../users/entities/user.entity';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { FriendsModule } from '../friends/friends.module';
import { UsersModule } from '../users/users.module';
import { MediasoupModule } from '../mediasoup/mediasoup.module';
import { MatchModule } from '../match/match.module';
import { CallService } from '../call/call.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom, ChatMessage, ChatRoomMember, User]),
    RedisModule,
    AuthModule,
    FriendsModule,
    UsersModule,
    MediasoupModule,
    MatchModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, CallService],
  exports: [ChatService],
})
export class ChatModule {}
