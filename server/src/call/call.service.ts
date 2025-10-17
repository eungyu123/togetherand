import { Injectable, Logger, Inject } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { ChatService } from '../chat/chat.service';
import { MediasoupService } from '../mediasoup/mediasoup.service';
import { getKoreanTime } from 'src/common/utils/date.util';
import { getUserKey } from '../mediasoup/utils/utils';
import Redis from 'ioredis';

// 화상통화 관련 상수
const CALL_CONSTANTS = {
  ACTIVE_TTL: 3600, // 활성 통화 TTL (초)
  REQUEST_TTL: 15, // 통화 요청 TTL (초) - 30초 후 자동 만료
} as const;

// 레디스 키 패턴
const REDIS_KEYS = {
  ROOM_CALL_REQUEST: (roomId: string) => `room:call:request:${roomId}`,
  ROOM_CALL_REQUEST_BACKUP: (roomId: string) => `room:call:request:backup:${roomId}`,
  ROOM_CALL_ACTIVE: (roomId: string) => `room:call:active:${roomId}`,
  // ROOM_CALL_RESPONSE는 필요없음
  USER_CALL_REQUEST: (userId: string) => `user:call:request:${userId}`,
  USER_CALL_ACTIVE: (userId: string) => `user:call:active:${userId}`,
  // 통화 응답 대기
  USER_CALL_RESPONSE: (userId: string) => `user:call:response:${userId}`,
} as const;

@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);
  private server: any; // WebSocket 서버 참조

  constructor(
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    private readonly chatService: ChatService,
    private readonly mediasoupService: MediasoupService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    @Inject('REDIS_SUBSCRIBER_CLIENT') private readonly redisSubscriberClient: Redis
  ) {
    this.setupRedisKeyspaceNotifications();
  }

  /**
   * WebSocket 서버 참조 설정
   */
  setServer(server: any) {
    this.server = server;
  }

  /**
   * Redis Keyspace Notifications 설정
   * ===========================================
   * Redis에서 키가 만료될 때 자동으로 이벤트를 받아서 처리하는 기능
   *
   * 작동 방식:
   * 1. Redis 서버에서 키가 TTL 만료되면 '__keyevent@0__:expired' 채널로 이벤트 발송
   * 2. 이 메서드에서 해당 채널을 구독하여 이벤트를 받음
   * 3. 통화 요청 키가 만료되면 handleCallRequestExpired() 메서드 호출
   *
   * 이벤트 형식: __keyevent@0__:expired room:call:request:room123
   * - @0: Redis 데이터베이스 번호 (0번 DB)
   * - expired: 만료 이벤트
   * - room:call:request:room123: 만료된 키 이름
   */
  private setupRedisKeyspaceNotifications() {
    // ===========================================
    // Redis 만료 이벤트 구독 설정 (별도 클라이언트 사용)
    // ===========================================

    // 패턴 구독: '__keyevent@0__:expired'
    // - __keyevent@0__: 0번 Redis DB의 키 이벤트
    // - :expired: 만료 이벤트만 구독
    // - 별도 subscriber 클라이언트 사용으로 메인 클라이언트 영향 없음
    this.redisSubscriberClient.psubscribe('__keyevent@0__:expired');

    // ===========================================
    // 만료 이벤트 리스너 등록
    // ===========================================
    this.redisSubscriberClient.on('pmessage', (pattern: string, channel: string, key: string) => {
      // pattern: 구독한 패턴 '__keyevent@0__:expired'
      // channel: 실제 이벤트 채널 '__keyevent@0__:expired'
      // key: 만료된 키 이름 (예: 'room:call:request:room123')

      this.logger.debug(`🔔 Redis 만료 이벤트 수신: ${key}`);

      // 통화 요청 키가 만료된 경우에만 처리
      if (pattern === '__keyevent@0__:expired' && key.startsWith('room:call:request:')) {
        this.logger.log(`⏰ 통화 요청 키 만료 감지: ${key}`);
        this.handleCallRequestExpired(key);
      }
    });

    this.logger.log('✅ Redis Keyspace Notifications 이벤트 리스너 설정 완료');
    this.logger.log('   → 통화 요청 타임아웃 시 자동으로 프론트엔드에 알림 전송');
    this.logger.log('   → 별도 subscriber 클라이언트 사용으로 메인 Redis 클라이언트 영향 없음');
  }

  /**
   * 통화 요청 만료 처리
   * ===========================================
   * Redis Keyspace Notifications로부터 만료 이벤트를 받았을 때 실행되는 메서드
   *
   * 처리 과정:
   * 1. 만료된 키에서 roomId 추출
   * 2. 백업 데이터에서 통화 요청 정보 복구
   * 3. 관련된 모든 Redis 데이터 정리
   * 4. 프론트엔드에 타임아웃 알림 전송
   *
   * @param expiredKey 만료된 Redis 키 (예: 'room:call:request:room123')
   */
  private async handleCallRequestExpired(expiredKey: string) {
    try {
      // ===========================================
      // 1. 만료된 키에서 roomId 추출
      // ===========================================
      const roomId = expiredKey.replace('room:call:request:', '');
      this.logger.log(`⏰ 통화 요청 만료 감지: ${roomId}`);

      // ===========================================
      // 2. 백업 데이터에서 통화 요청 정보 복구
      // ===========================================
      const callRequestData = await this.redisService.get(REDIS_KEYS.ROOM_CALL_REQUEST_BACKUP(roomId));

      if (callRequestData && this.server) {
        // ===========================================
        // 3. 관련된 모든 Redis 데이터 정리
        // ===========================================

        // 3-1. 요청받은 모든 사용자의 응답 대기 상태 삭제
        if (callRequestData.recipients && Array.isArray(callRequestData.recipients)) {
          const deletePromises = callRequestData.recipients.map(recipientId =>
            this.redisService.del(REDIS_KEYS.USER_CALL_RESPONSE(recipientId))
          );
          await Promise.all(deletePromises);
          this.logger.log(`🧹 ${callRequestData.recipients.length}명의 응답 대기 상태 삭제 완료`);
        }

        await this.redisService.del(REDIS_KEYS.USER_CALL_REQUEST(callRequestData.callerId));
        await this.redisService.del(REDIS_KEYS.ROOM_CALL_REQUEST_BACKUP(roomId));

        // ===========================================
        // 4. 프론트엔드에 타임아웃 알림 전송
        // ===========================================
        // 채팅방의 모든 멤버에게 통화 요청이 타임아웃되었음을 알림
        this.server.to(`room:${roomId}`).emit('call:cancelled', {
          callerId: callRequestData.callerId,
          callerName: callRequestData.callerName,
          timestamp: getKoreanTime(),
        });

        this.logger.log(`📞 통화 요청 타임아웃 알림 전송: ${roomId} (${callRequestData.callerName})`);
      } else {
        this.logger.warn(`⚠️ 백업 데이터를 찾을 수 없음: ${REDIS_KEYS.ROOM_CALL_REQUEST_BACKUP(roomId)}`);
      }
    } catch (error) {
      this.logger.error('통화 요청 만료 처리 실패:', error);
    }
  }

  // prettier-ignore
  /**
   * 화상통화 요청 처리
   */
  async handleCallRequest(client: Socket, data: { roomId: string }) {
    const userId = client.handshake.auth.userId;
    const { roomId } = data;

    console.log('handleCallRequest', client.id, );

    try {
      // 사용자 정보 조회
      const caller = await this.usersService.findById(userId);
      if (!caller) {
        throw new WsException('사용자를 찾을 수 없습니다.');
      }

      // 채팅방 멤버인지 확인
      const isMember = await this.chatService.isRoomMember(userId, roomId);
      if (!isMember) {
        throw new WsException('채팅방에 접근할 권한이 없습니다.');
      }

      // 채팅방 멤버 조회 (DB 기반)
      const roomMembers = await this.chatService.getRoomMembers(roomId, userId);
      const otherMembers = roomMembers.filter(member => member.userId !== userId);

      this.logger.debug(`📡 채팅방 ${roomId}의 총 멤버 수: ${roomMembers.length}, 상대방 수: ${otherMembers.length}`);

      if (otherMembers.length === 0) {
        throw new WsException('통화할 상대방이 없습니다.');
      }

      // 채팅방 통화 요청 중 중복 검사
      const existingCallRequest = await this.redisService.get(REDIS_KEYS.ROOM_CALL_REQUEST(roomId));
      if (existingCallRequest) {
        throw new WsException('화상통화 요청이 이미 존재합니다.');
      }

      // 채팅방 통화 중 중복 검사
      const existingActiveCall = await this.redisService.get(REDIS_KEYS.ROOM_CALL_ACTIVE(roomId));
      if (existingActiveCall) {
        throw new WsException('이 채팅방에서 화상통화가 이미 진행중입니다.');
      }

      // 사용자 통화 응답 대기 중 중복 검사
      const existingUserCallResponse = await this.redisService.get(REDIS_KEYS.USER_CALL_RESPONSE(userId));
      if (existingUserCallResponse) {
        throw new WsException('화상통화 응답 대기중입니다.');
      }

      // 사용자 통화 요청 중 중복 검사
      const userCallRequest = await this.redisService.get(REDIS_KEYS.USER_CALL_REQUEST(userId));
      if (userCallRequest) {
        throw new WsException(`이미 다른 채팅방에 통화 요청을 보냈습니다.`);
      }

      // 사용자 통화 중 중복 검사
      const userActiveCall = await this.redisService.get(REDIS_KEYS.USER_CALL_ACTIVE(userId));
      if (userActiveCall) {
        throw new WsException(`다른 채팅방에서 통화 중입니다.`);
      }

      // 1. 현재 온라인인 멤버들에게 즉시 알림
      const roomSockets = await this.server.in(`room:${roomId}`).fetchSockets();

      // Redis 저장만 병렬로 처리 (emit은 동기이므로 즉시 실행)
      const redisPromises = roomSockets
        .filter((socket: any) => {
          const socketUserId = socket.data.userId || socket.handshake.auth.userId;
          return socketUserId && socketUserId !== userId;
        })
        .map(async (socket: any) => {
          const socketUserId = socket.data.userId || socket.handshake.auth.userId;

          // 소켓 emit은 동기이므로 즉시 실행
          socket.emit('call:incoming', {
            callerId: userId,
            callerName: caller.userName,
            callerPhotoUrl: caller.photoUrl,
            roomId: roomId,
            timestamp: getKoreanTime(),
          });

          // Redis 저장만 비동기로 처리
          return this.redisService.set(REDIS_KEYS.USER_CALL_RESPONSE(socketUserId), {
            callerId: userId,
            callerName: caller.userName,
            roomId: roomId,
            timestamp: getKoreanTime(),
          });
        });

      // Redis 저장 작업들을 병렬로 처리
      await Promise.all(redisPromises);
      const sentCount = redisPromises.length;

      // 2. 오프라인 멤버들을 위한 요청 저장 (나중에 접속 시 알림)
      const offlineMembers = otherMembers.filter(
        member =>
          !roomSockets.some((socket: any) => (socket.data.userId || socket.handshake.auth.userId) === member.userId)
      );

      // 화상통화 요청 상태 저장
      const callRequestData = {
        callerId: userId,
        callerName: caller.userName,
        participants: [userId], // 발신자 포함
        status: 'requesting',
        createdAt: getKoreanTime(),
        offlineMembers: offlineMembers.map(member => member.userId),
        totalMembers: otherMembers.length,
        recipients: otherMembers.map(member => member.userId), // 요청받은 모든 사용자 목록
      };

      await this.redisService.set(REDIS_KEYS.ROOM_CALL_REQUEST(roomId), callRequestData, CALL_CONSTANTS.REQUEST_TTL);
      await this.redisService.set(REDIS_KEYS.ROOM_CALL_REQUEST_BACKUP(roomId), callRequestData, CALL_CONSTANTS.REQUEST_TTL + 10);

      // 사용자별 통화 요청 상태 저장 (30초 후 자동 만료)
      const userCallRequestData = {
        roomId: roomId,
        roomName: `채팅방 ${roomId}`,
        status: 'requesting',
        createdAt: getKoreanTime(),
      };

      await this.redisService.set(REDIS_KEYS.USER_CALL_REQUEST(userId), userCallRequestData, CALL_CONSTANTS.REQUEST_TTL);

      this.logger.log(`✅ 화상통화 요청 전송 완료: ${userId}, ${sentCount}명에게 전송)`);

      return {
        success: true,
        message: `${sentCount}명에게 화상통화 요청을 전송했습니다.`,
      };
    } catch (error) {
      this.logger.error('Call request error:', error);
      throw error; // 이미 던져진 예외를 다시 던지거나, 새로운 예외를 던짐
    }
  }

  /**
   * 화상통화 응답 처리 (수락/거절)
   */
  async handleCallResponse(client: Socket, data: { callerId: string; accepted: boolean; roomId: string }) {
    const userId = client.handshake.auth.userId;
    const user = await this.usersService.findById(userId);
    const { callerId, accepted, roomId } = data;

    this.logger.log(`✅ 화상통화 요청: ${callerId} → ${accepted},  → ${roomId}, ${userId}`);

    try {
      // 발신자 소켓 찾기
      const callerSocket = await this.findSocketByUserId(callerId, this.server);
      if (!callerSocket) {
        return { success: false, message: '발신자를 찾을 수 없습니다.' };
      }

      // 사용자의 응답 대기 상태 삭제 (수락/거절 공통)
      await this.redisService.del(REDIS_KEYS.USER_CALL_RESPONSE(userId));

      if (accepted) {
        // 요청 중인 통화에 참가
        const callRequestData = await this.redisService.get(REDIS_KEYS.ROOM_CALL_REQUEST(roomId));
        const callActiveData = await this.redisService.get(REDIS_KEYS.ROOM_CALL_ACTIVE(roomId));

        // 둘 다 없으면 통화 요청이 만료되었거나 존재하지 않음
        if (!callRequestData && !callActiveData) {
          return { success: false, message: '화상통화 요청이 만료되었습니다.' };
        }

        if (callRequestData) {
          await this.joinRequestingCall(userId, roomId, callRequestData);
          this.logger.log(`✅ 요청 중인 통화에 참가: ${userId} → ${roomId}`);

          // 미디어소프 방에 참가자들 조인
          const participants = [...callRequestData.participants, userId];
          await this.mediasoupService.joinMediasoupRoom(participants, roomId);

          // 발신자에게 미디어소프 매칭 성사 알림 (요청 중인 통화에만)
          this.logger.log(`✅ ${callerSocket.id} 미디어소프 매칭 성사 알림 전송`);
          callerSocket.emit('call:success', {
            roomId: roomId,
            rtpCapabilities: await this.mediasoupService.getRouterRtpCapabilities(roomId),
            timestamp: getKoreanTime(),
          });
        } else if (callActiveData) {
          await this.joinActiveCall(userId, roomId, callActiveData);
          this.logger.log(`✅ 활성 통화에 참가: ${userId} → ${roomId}`);

          // 미디어소프 방에 새 참가자 조인
          const participants = [...callActiveData.participants, userId];
          await this.mediasoupService.joinMediasoupRoom(participants, roomId);
        }

        // 채팅방의 모든 소켓에게 새로운 유저 통화 들어옴 알림
        this.server.to(`room:${roomId}`).emit('call:user_joined', {
          userId: userId,
          userName: user.userName,
          userPhotoUrl: user.photoUrl,
          timestamp: getKoreanTime(),
        });

        // 발신자에게 수락 알림 (어떤 사용자가 수락했는지 알림)
        callerSocket.emit('call:accepted', {
          roomId: roomId,
          acceptedBy: userId,
          timestamp: getKoreanTime(),
        });

        // 응답자에게 미디어소프 매칭 성사 알림
        client.emit('call:success', {
          roomId: roomId,
          rtpCapabilities: await this.mediasoupService.getRouterRtpCapabilities(roomId),
          timestamp: getKoreanTime(),
        });

        this.logger.debug(`✅ 화상통화 수락 완료: ${roomId} (채팅방 ${roomId}의 모든 멤버에게 알림)`);
      } else {
        // 발신자에게만 거절 알림 (다른 사람은 여전히 수락할 수 있음)
        callerSocket.emit('call:rejected', {
          rejectedBy: userId,
          timestamp: getKoreanTime(),
        });

        this.logger.debug(`✅ 화상통화 거절: ${roomId} (${userId}가 거절)`);
      }

      this.logger.log(`✅ 화상통화 응답 처리 완료`);
      return { success: true, message: accepted ? '화상통화를 수락했습니다.' : '화상통화를 거절했습니다.' };
    } catch (error) {
      this.logger.error('Call response error:', error);
      return { success: false, message: '화상통화 응답 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 화상통화 종료 처리
   */
  async handleCallEnd(client: Socket, roomId: string) {
    const userId = client.handshake.auth.userId;
    const user = await this.usersService.findById(userId);

    try {
      if (!roomId) {
        console.error('!!!!!!!!!!!!!!!!!!! roomId가 없습니다.');
        return { success: false, message: 'roomId가 없습니다.' };
      }

      // 방의 화상통화 활성 상태 확인
      const activeCallData = await this.redisService.get(REDIS_KEYS.ROOM_CALL_ACTIVE(roomId));
      // 방의 화상통화 요청 상태 확인
      const requestCallData = await this.redisService.get(REDIS_KEYS.ROOM_CALL_REQUEST(roomId));
      console.log('activeCallData', activeCallData);
      if (!activeCallData && !requestCallData) {
        console.error('!!!!!!!!!!!!!!!!!!! 진행 중인 통화가 없습니다.');
        return { success: false, message: '진행 중인 통화가 없습니다.' };
      }

      // 화상통화 참가자인지 확인 (activeCallData가 있을 때만)
      if (activeCallData && !activeCallData.participants.includes(userId)) {
        console.error('!!!!!!!!!!!!!!! 통화에 참가하지 않은 사용자입니다.');
        return { success: false, message: '통화에 참가하지 않은 사용자입니다.' };
      }

      // 전화 중 상태인 경우 => 화상통화 남은 참가자 수에 따라 [1. 완전 종료 또는 2. 퇴장 처리]
      console.log('activeCallData', activeCallData);
      if (activeCallData) {
        if (activeCallData.participants.length <= 2) {
          await this.endCallCompletely(activeCallData, roomId);
        } else {
          await this.leaveCall(userId, activeCallData, roomId, activeCallData.participants, user);
        }
      }

      // 요청 상태인 경우 요청 삭제
      if (requestCallData) {
        await this.redisService.del(REDIS_KEYS.ROOM_CALL_REQUEST(roomId));
        await this.redisService.del(REDIS_KEYS.ROOM_CALL_REQUEST_BACKUP(roomId));
        await this.redisService.del(REDIS_KEYS.USER_CALL_REQUEST(userId));

        // 채팅방의 모든 멤버에게 통화 취소 알림
        this.server.to(`room:${roomId}`).emit('call:cancelled', {
          callerId: requestCallData.callerId,
          callerName: requestCallData.callerName,
          timestamp: getKoreanTime(),
        });

        // 요청 상태인 경우 수신자들의 응답대기 삭제
        requestCallData.participants.forEach(userId => {
          this.redisService.del(REDIS_KEYS.USER_CALL_RESPONSE(userId));
        });
      }

      // Mediasoup 리소스 정리
      try {
        await this.mediasoupService.cleanUp(userId);
      } catch (error) {
        this.logger.error('Call cleanup error:', error);
      }

      this.logger.log(
        `✅ 화상통화 종료 완료: ${JSON.stringify(roomId)} (채팅방 ${JSON.stringify(roomId)}의 모든 멤버에게 알림)`
      );

      return { success: true, message: '화상통화를 종료했습니다.' };
    } catch (error) {
      this.logger.error('Call end error:', error);
      return { success: false, message: '화상통화 종료 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 대기 중인 화상통화 요청 확인 (사용자 접속 시)
   */
  async checkPendingCallRequest(client: Socket) {
    const userId = client.handshake.auth.userId;

    try {
      // 사용자가 속한 모든 채팅방 조회
      const userRooms = await this.chatService.getUserChatRooms(userId);
      const pendingCalls: Array<{
        callerId: string;
        callerName: string;
        roomId: string;
        roomName: string;
        timestamp: Date;
      }> = [];

      // 각 채팅방에서 대기 중인 통화 요청 확인 (Redis TTL 기반)
      for (const room of userRooms) {
        const callRequest = await this.redisService.get(REDIS_KEYS.ROOM_CALL_REQUEST(room.id));
        if (callRequest && callRequest.callerId !== userId) {
          // Redis TTL이 자동으로 만료된 키는 조회되지 않으므로, 조회된 요청은 유효함
          pendingCalls.push({
            callerId: callRequest.callerId,
            callerName: callRequest.callerName,
            roomId: room.id,
            roomName: room.name,
            timestamp: getKoreanTime(),
          });

          this.logger.log(`📞 대기 중인 화상통화 요청 발견: ${userId} → ${room.id} (${callRequest.callerName})`);
        }
      }

      // 대기 중인 통화 요청이 있으면 클라이언트에게 알림
      if (pendingCalls.length > 0) {
        // 가장 최근 요청을 우선으로 알림 (첫 번째 요청)
        const latestCall = pendingCalls[0];
        client.emit('call:incoming', latestCall);

        return {
          success: true,
          hasPendingCall: true,
          pendingCalls: pendingCalls,
          message: `${pendingCalls.length}개의 대기 중인 통화 요청이 있습니다.`,
        };
      }

      // 대기 중인 통화 요청이 없는 경우
      return {
        success: true,
        hasPendingCall: false,
        pendingCalls: [],
        message: '대기 중인 통화 요청이 없습니다.',
      };
    } catch (error) {
      this.logger.error('대기 중인 통화 요청 확인 실패:', error);
      return {
        success: false,
        message: '통화 요청 확인 중 오류가 발생했습니다.',
      };
    }
  }

  async checkExistingParticipants(client: Socket, roomId: string) {
    try {
      const userId = client.handshake.auth.userId;
      const callActiveData = await this.redisService.get(REDIS_KEYS.ROOM_CALL_ACTIVE(roomId));
      const existingParticipants = await this.getExistingParticipants(callActiveData, userId);
      return {
        success: true,
        existingParticipants: existingParticipants,
      };
    } catch (error) {
      this.logger.error('기존 참가자 정보 조회 실패:', error);
      return {
        success: false,
        message: '기존 참가자 정보 조회 중 오류가 발생했습니다.',
      };
    }
  }

  // ==================== 헬퍼 메서드 ====================

  /**
   * userId로 연결된 소켓 찾기
   */
  private async findSocketByUserId(userId: string, server: any): Promise<any> {
    const sockets = await server.fetchSockets();
    for (const socket of sockets) {
      if (socket.data.userId === userId || socket.handshake.auth.userId === userId) {
        return socket;
      }
    }
    return null;
  }

  // Redis TTL 기반 자동 만료로 인해 수동 타임아웃 체크가 불필요함

  /**
   * 기존 참가자 정보 조회 (새로 참가한 사용자 제외)
   */
  private async getExistingParticipants(callActiveData: any, newUserId: string) {
    if (!callActiveData?.participants || !Array.isArray(callActiveData.participants)) {
      return [];
    }

    const existingParticipantIds = callActiveData.participants.filter((id: string) => id !== newUserId);

    return await Promise.all(
      existingParticipantIds.map(async (participantId: string) => {
        const participant = await this.usersService.findById(participantId);
        return {
          userId: participantId,
          userName: participant?.userName,
          userPhotoUrl: participant?.photoUrl,
        };
      })
    );
  }

  /**
   * 요청 중인 통화에 참가
   */
  private async joinRequestingCall(userId: string, roomId: string, callRequest: any) {
    // 데이터 유효성 검사
    if (!callRequest || !callRequest.participants || !Array.isArray(callRequest.participants)) {
      throw new Error('잘못된 통화 요청 데이터입니다.');
    }

    // 중복 참가자 체크
    if (callRequest.participants.includes(userId)) {
      throw new Error('이미 통화에 참가하고 있습니다.');
    }

    // callRequest.participants 는 한명임
    const participants = [...callRequest.participants, userId];
    const activeCallData = {
      ...callRequest,
      participants,
      status: 'active',
      startedAt: getKoreanTime(),
      roomId: roomId,
    };

    // 채팅방 활성 통화 상태 저장
    await this.redisService.set(REDIS_KEYS.ROOM_CALL_ACTIVE(roomId), activeCallData, CALL_CONSTANTS.ACTIVE_TTL);
    // 모든 참가자의 활성 통화 상태 저장
    for (const userId of participants) {
      await this.redisService.set(REDIS_KEYS.USER_CALL_ACTIVE(userId), activeCallData, CALL_CONSTANTS.ACTIVE_TTL);
    }
    // 채팅방 요청 상태 삭제
    await this.redisService.del(REDIS_KEYS.ROOM_CALL_REQUEST(roomId));
    // 채팅방 요청 백업 상태 삭제
    await this.redisService.del(REDIS_KEYS.ROOM_CALL_REQUEST_BACKUP(roomId));
    // 발신자 요청 상태 삭제
    await this.redisService.del(REDIS_KEYS.USER_CALL_REQUEST(callRequest.callerId));
  }

  /**
   * 활성 통화에 참가
   */
  private async joinActiveCall(userId: string, roomId: string, callActive: any) {
    // 데이터 유효성 검사
    if (!callActive || !callActive.participants || !Array.isArray(callActive.participants)) {
      throw new Error('잘못된 활성 통화 데이터입니다.');
    }

    // 중복 참가자 체크
    if (callActive.participants.includes(userId)) {
      throw new Error('이미 통화에 참가하고 있습니다.');
    }

    const participants = [...callActive.participants, userId];
    const updatedCallActive = { ...callActive, participants };

    // 채팅방 활성 통화 상태 업데이트
    await this.redisService.set(REDIS_KEYS.ROOM_CALL_ACTIVE(roomId), updatedCallActive, CALL_CONSTANTS.ACTIVE_TTL);

    // 추가 참가자의 활성 통화 상태 저장 (중복 Redis 호출 제거)
    await this.redisService.set(REDIS_KEYS.USER_CALL_ACTIVE(userId), updatedCallActive, CALL_CONSTANTS.ACTIVE_TTL);
  }

  /**
   * 화상통화 완전 종료 처리
   */
  private async endCallCompletely(callData: any, roomId: string): Promise<void> {
    // 활성 통화 상태 삭제
    await this.redisService.del(REDIS_KEYS.ROOM_CALL_ACTIVE(roomId));

    // 모든 참가자의 사용자별 활성 통화 상태 및 통화 요청 상태 삭제
    for (const participantId of callData.participants) {
      await this.redisService.del(REDIS_KEYS.USER_CALL_ACTIVE(participantId)); // 통화 상태 삭제
      await this.redisService.del(REDIS_KEYS.USER_CALL_REQUEST(participantId)); // 통화 요청 상태
    }

    // 채팅방 전체에 통화 종료 알림
    this.server.to(`room:${roomId}`).emit('call:ended', {});

    callData.participants.forEach(userId => {
      this.redisService.del(REDIS_KEYS.USER_CALL_RESPONSE(userId));
    });

    this.logger.log(`📞 화상통화 완전 종료: ${roomId} (마지막 참가자 퇴장)`);
  }

  // prettier-ignore
  /**
   * 개별 사용자 통화 퇴장 처리
   */
  private async leaveCall(
    userId: string,
    callData: any,
    roomId: string,
    remainingParticipants: string[],
    user: any,
  ): Promise<void> {
    // 활성 통화 상태 업데이트
    await this.redisService.set(REDIS_KEYS.ROOM_CALL_ACTIVE(roomId), { ...callData, participants: remainingParticipants, }, CALL_CONSTANTS.ACTIVE_TTL);
    await this.redisService.del(REDIS_KEYS.USER_CALL_ACTIVE(userId)); // 통화 상태 삭제
    await this.redisService.del(REDIS_KEYS.USER_CALL_REQUEST(userId)); // 통화 요청 상태

    // 채팅방 전체에 사용자 퇴장 알림
    this.server.to(`room:${roomId}`).emit('call:user_left', {
      userId: userId,
      userName: user.userName,
      userPhotoUrl: user.photoUrl,
      timestamp: getKoreanTime(),
    });

    this.logger.log(`👋 화상통화 퇴장: ${userId} (${remainingParticipants.length}명 남음)`);
  }

  // Redis TTL 기반 자동 만료로 인해 수동 만료 체크가 불필요함
}
