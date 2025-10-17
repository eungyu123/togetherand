// src/match/match.gateway.ts

// prettier-ignore
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { MediasoupService } from 'src/mediasoup/mediasoup.service';
import { MediasoupGateway } from 'src/mediasoup/mediasoup.gateway';
import { getKoreanTimeFormatted } from 'src/common/utils/date.util';
import { getUserKey } from 'src/mediasoup/utils/utils';
import { UsersService } from 'src/users/users.service';
import { MatchService } from 'src/match/match.service';
import { v4 as uuidv4 } from 'uuid';

interface CustomSocket extends Socket {
  userKey: string;
  userName: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  path: '/socket.io',
  namespace: '/match',
  transports: ['websocket'],
})
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MatchGateway.name);
  private readonly MATCH_SOCKET_KEY = 'match:socket:user:';
  private readonly MATCH_ROOM_KEY = 'match:room:key:';

  constructor(
    private readonly redisService: RedisService,
    private readonly mediasoupService: MediasoupService,
    private readonly mediasoupGateway: MediasoupGateway,
    private readonly userService: UsersService,
    private readonly matchService: MatchService
  ) {}

  /**
   * 미디어소프 소켓 연결 처리
   * TODO:기존 소켓 정리
   */
  async handleConnection(client: CustomSocket) {
    try {
      const userId = client.handshake.auth.userId;
      const deviceId = client.handshake.auth.deviceId;

      if (!userId && !deviceId) {
        this.logger.error('❌ User ID 와 Device ID를 찾을 수 없습니다.');
        client.disconnect();
        return;
      }

      const { userKey, anonymous } = getUserKey(userId, deviceId);
      let userName: string;

      if (anonymous) {
        userName = '상대방';
      } else {
        const user = await this.userService.findById(userId);
        userName = user.userName;
      }

      client.userKey = userKey;
      client.userName = userName;

      // MediasoupService에 서버 참조 설정
      this.mediasoupService.setServer(this.mediasoupGateway.server);

      // MatchService에 서버 참조 설정
      this.matchService.setServer(this.server);

      // 매칭 대기 취소
      const gameTypes = ['any_option', 'leagueoflegends', 'tft', 'overwatch', 'valorant'];
      const queueRemovalPromises = gameTypes.map(async gameType => {
        await this.matchService.cancelMatchRequest(userKey, { gameType });
      });
      await Promise.all(queueRemovalPromises);

      await this.redisService.set(`${this.MATCH_SOCKET_KEY}${userKey}`, client.id, 60 * 60 * 24 * 1000);

      this.logger.log(`✅ ${userKey} 매칭 소켓 연결 완료`);
    } catch (error) {
      this.logger.error('❌ 연결 실패:', error.message);
      client.disconnect();
    }
  }

  /**
   * 클라이언트 연결 해제 처리
   */
  async handleDisconnect(client: CustomSocket) {
    this.logger.log(`❌ 클라이언트 연결 해제: ${client.id}`);
    // console.log('client.rooms', client.rooms.entries()); 자동정리되서 없음

    const userKey = client.userKey;

    // 매칭 대기 취소
    const gameTypes = ['any_option', 'leagueoflegends', 'tft', 'overwatch', 'valorant'];
    const queueRemovalPromises = gameTypes.map(async gameType => {
      await this.matchService.cancelMatchRequest(userKey, { gameType });
    });
    await Promise.all(queueRemovalPromises);

    // 3. 레디스로 룸 조회
    const roomId = await this.redisService.get(`${this.MATCH_ROOM_KEY}${userKey}`);
    const roomMemberCount = await this.matchService.getRoomMemberCount(roomId);

    // 여기 다시 봐야함 이거 잘못됐음 왜냐냐면 자동으로 나가져서 2명이하가 아니라 1명이하고 암튼 다시보기
    if (roomMemberCount <= 2) {
      this.server.to(roomId).emit('match:match_end', { roomId });
    } else {
      this.server.to(roomId).emit('match:user_left', {
        userKey,
        userName: client.userName,
        timestamp: getKoreanTimeFormatted(),
      });
    }

    this.redisService.del(`${this.MATCH_ROOM_KEY}${userKey}`);
    this.redisService.del(`${this.MATCH_SOCKET_KEY}${userKey}`);
  }

  /**
   * 매칭 대기 등록
   */
  @SubscribeMessage('match:create_match_request')
  async handleCreateMatchRequest(@ConnectedSocket() client: CustomSocket, @MessageBody() data: { gameType: string }) {
    const { gameType } = data;
    const userKey = client.userKey;

    // 매칭 대기 등록
    const queuePosition = await this.matchService.createMatchRequest({ gameType }, userKey);

    // 매칭 시도
    const result = await this.matchService.tryMatchmaking(gameType);

    // result.result.success => 매칭 성사시 유저에게 알림 전송
    if (result && result.success && result.roomId && result.userKeys) {
      this.notifyMatchSuccess({
        roomId: result.roomId,
        userKeys: result.userKeys,
      });
    }

    this.logger.debug(`✅ 매칭 대기 등록 성공: ${userKey} -> ${gameType}`);

    return {
      success: true,
      message: '매칭 대기 등록 성공',
      position: queuePosition.position,
    };
  }

  /**
   * 매칭 대기 취소
   */
  @SubscribeMessage('match:cancel_match_request')
  async handleCancelMatchRequest(@ConnectedSocket() client: CustomSocket, @MessageBody() data: { gameType: string }) {
    const { gameType } = data;
    const userKey = client.userKey;

    const result = await this.matchService.cancelMatchRequest(userKey, { gameType });

    this.logger.debug(`✅ 매칭 대기 취소 성공: ${userKey} -> ${gameType}`);

    return {
      success: true,
      message: '매칭 대기 취소 성공',
    };
  }

  /**
   * 매칭 성사 알림 전송
   */
  async notifyMatchSuccess({ roomId, userKeys }: { roomId: string; userKeys: string[] }) {
    try {
      // 1. 먼저 모든 참가자를 매칭 룸에 조인
      const socketIds = await Promise.all(
        userKeys.map(userKey => this.redisService.get(`${this.MATCH_SOCKET_KEY}${userKey}`))
      );

      const validSocketIds = socketIds.filter(socketId => socketId !== null);

      if (validSocketIds.length > 0) {
        // 매치 네임스페이스 룸에 조인
        this.server.in(validSocketIds).socketsJoin(`room:${roomId}`);
        this.logger.log(`✅ ${validSocketIds.length}명의 참가자를 매칭 룸에 조인: ${roomId}`);

        // 미디어소프 네임스페이스 룸에도 조인
        await this.mediasoupService.joinMediasoupRoom(userKeys, roomId);
        // 레디스 저장
        for (const userKey of userKeys) {
          await this.redisService.set(`${this.MATCH_ROOM_KEY}${userKey}`, `room:${roomId}`, 60 * 60 * 2 * 1000); // 2시간 후 매칭 룸 정리
        }
      }

      // 2. 그 다음에 각 참가자에게 매칭 성사 알림 전송
      for (const userKey of userKeys) {
        const socketId = await this.redisService.get(`${this.MATCH_SOCKET_KEY}${userKey}`);
        if (socketId) {
          // 1대1 매칭: 현재 사용자를 제외한 상대방 찾기
          const opponentUserKey = userKeys.find(p => p !== userKey);

          if (!opponentUserKey) {
            this.logger.warn(`❌ 상대방을 찾을 수 없음: ${userKey}`);
            return;
          }

          // 상대방 정보 조회
          let opponentsUser;
          try {
            const opponentUser = await this.userService.findById(opponentUserKey);
            opponentsUser = {
              userId: opponentUser.id,
              userName: opponentUser.userName,
              photoUrl: opponentUser.photoUrl,
            };
          } catch (error) {
            this.logger.warn(`❌ 상대방 유저 정보 조회 실패: ${opponentUserKey}`, error.message);
            // 유저 정보가 없어도 매칭은 진행 (익명 사용자로 처리)
            opponentsUser = {
              userId: opponentUserKey,
              userName: 'anonymous',
              photoUrl: undefined,
            };
          }

          // 매칭 성사 알림 전송
          this.server.to(socketId).emit('match:match_success', {
            roomId,
            userKeys,
            opponentsUser,
            rtpCapabilities: await this.mediasoupService.getRouterRtpCapabilities(roomId),
            timestamp: getKoreanTimeFormatted(),
          });

          this.logger.debug(`✅ 매칭 성사 알림 전송: ${userKey} (상대방: ${opponentsUser.userName}, Room: ${roomId})`);
        } else {
          this.logger.warn(`❌ 매칭 성사 알림 전송 실패: ${userKey}`);
        }
      }
    } catch (error) {
      this.logger.error('❌ 매칭 성사 알림 전송 실패:', error);
    }
  }

  /**
   * 매칭 종료
   */
  @SubscribeMessage('match:end_match')
  async handleEndMatch(@ConnectedSocket() client: CustomSocket, @MessageBody() data: { roomId: string }) {
    const { roomId } = data;
    const userKey = client.userKey;
    return { success: true };
  }

  /**
   * 메시지 전송
   */
  @SubscribeMessage('match:send_message')
  async handleSendMessage(
    @ConnectedSocket() client: CustomSocket,
    @MessageBody() data: { message: string; roomId: string }
  ) {
    const { message, roomId } = data;
    const userKey = client.userKey;
    const userName = client.userName;

    // 브로드캐스트 메시지 전송 (자신 포함)
    this.server.to(`room:${roomId}`).emit('match:receive_message', {
      id: `${uuidv4()}`,
      senderId: userKey,
      senderName: userName,
      roomId: roomId,
      content: message,
      createdAt: new Date().toISOString(),
      type: 'text',
    });

    this.logger.debug(`✅ 채팅 메시지 전송: ${userName} -> ${roomId}`);

    return { success: true };
  }

  /**
   * 타이핑 시작
   */
  @SubscribeMessage('match:typing_start')
  async handleTypingStart(@ConnectedSocket() client: CustomSocket, @MessageBody() data: { roomId: string }) {
    const { roomId } = data;
    const userKey = client.userKey;
    const userName = client.userName;

    // 같은 룸의 다른 유저들에게 타이핑 시작 알림
    client.to(`room:${roomId}`).emit('match:opponent_typing_start', {
      senderId: userKey,
      senderName: userName,
      roomId: roomId,
    });

    this.logger.debug(`✅ 타이핑 시작: ${userName} in ${roomId}`);

    return { success: true };
  }

  /**
   * 타이핑 중지
   */
  @SubscribeMessage('match:typing_stop')
  async handleTypingStop(@ConnectedSocket() client: CustomSocket, @MessageBody() data: { roomId: string }) {
    const { roomId } = data;
    const userKey = client.userKey;
    const userName = client.userName;

    // 같은 룸의 다른 유저들에게 타이핑 중지 알림
    client.to(`room:${roomId}`).emit('match:opponent_typing_stop', {
      senderId: userKey,
      senderName: userName,
      roomId: roomId,
    });

    this.logger.debug(`✅ 타이핑 중지: ${userName} in ${roomId}`);

    return { success: true };
  }
}
