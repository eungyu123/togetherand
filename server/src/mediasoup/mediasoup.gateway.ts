// src/mediasoup/mediasoup.gateway.ts

// prettier-ignore
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { MediasoupService } from './mediasoup.service';
import { getKoreanTimeFormatted } from 'src/common/utils/date.util';
import { getUserKey } from './utils/utils';
import { types as mediasoupTypes } from 'mediasoup';
import { UsersService } from 'src/users/users.service';

interface CustomSocket extends Socket {
  userKey: string;
  userName: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  path: '/socket.io',
  namespace: '/mediasoup',
  transports: ['websocket'],
})
export class MediasoupGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MediasoupGateway.name);
  private readonly MEDIASOUP_SOCKET_KEY = 'mediasoup:socket:user:';
  private readonly MEDIASOUP_ROOM_KEY = 'mediasoup:room:key:';
  constructor(
    private readonly mediasoupService: MediasoupService,
    private readonly userService: UsersService,
    private readonly redisService: RedisService
  ) {}

  /**
   * 미디어소프 소켓 연결 처리
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

      // Redis에 미디어소프 소켓 ID 저장
      await this.redisService.set(`${this.MEDIASOUP_SOCKET_KEY}${userKey}`, client.id, 60 * 60 * 2 * 1000); // 2시간 TTL

      this.logger.log(`✅ ${userKey} 미디어소프 소켓 연결 완료`);
    } catch (error) {
      this.logger.error('❌ 연결 실패:', error.message);
      client.disconnect();
    }
  }

  /**
   * 클라이언트 연결 해제 처리
   */
  async handleDisconnect(client: CustomSocket) {
    const userKey = client.userKey;
    const userName = client.userName;
    const roomId = await this.redisService.get(`${this.MEDIASOUP_ROOM_KEY}${userKey}`);

    // 1. 룸에서 나가기 (자동 처리)
    // await client.leave(`room:${roomId}`);

    // 2. 사용자 퇴장
    if (roomId) {
      await this.mediasoupService.handleUserLeave(userKey, userName, roomId);
    }

    // 3. Redis에서 방 관련 데이터 삭져
    this.redisService.del(`${this.MEDIASOUP_ROOM_KEY}${userKey}`);
    this.redisService.del(`${this.MEDIASOUP_SOCKET_KEY}${userKey}`);
  }

  /**
   * 전송 트랜스포트 생성
   */
  @SubscribeMessage('client:create_send_transport')
  async handleSendCreateTransport(@ConnectedSocket() client: CustomSocket, @MessageBody() data: { roomId: string }) {
    try {
      const userKey = client.userKey;
      const { roomId } = data;
      const transport = await this.mediasoupService.createWebRtcTransport(roomId, userKey);

      this.logger.debug(`✅ 전송 트랜스포트 생성 완료: ${transport.id} (Room: ${roomId})`);
      return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      };
    } catch (error) {
      this.logger.error(`❌ 전송 트랜스포트 생성 실패: ${client.userKey} (Room: ${data.roomId})`, error);
      throw error;
    }
  }

  /**
   * 수신 트랜스포트 생성
   */
  @SubscribeMessage('client:create_recv_transport')
  async handleReceiveCreateTransport(@ConnectedSocket() client: CustomSocket, @MessageBody() data: { roomId: string }) {
    try {
      const userKey = client.userKey;
      const { roomId } = data;
      const transport = await this.mediasoupService.createWebRtcTransport(roomId, userKey);

      this.logger.debug(`✅ 수신 트랜스포트 생성 완료: ${transport.id} (Room: ${roomId})`);

      return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      };
    } catch (error) {
      this.logger.error(`❌ 수신 트랜스포트 생성 실패: ${client.userKey} (Room: ${data.roomId})`, error);
      throw error;
    }
  }

  /**
   * 트랜스포트 연결
   */
  @SubscribeMessage('client:connect_web_rtc_transport')
  async handleConnectTransport(
    @ConnectedSocket() client: CustomSocket,
    @MessageBody() data: { id: string; dtlsParameters: mediasoupTypes.DtlsParameters; test?: string }
  ) {
    const webRtcTransport = this.mediasoupService.getWebRtcTransport(data.id);
    if (!webRtcTransport) {
      this.logger.error('❌ 트랜스포트 없음');
      return;
    }

    webRtcTransport.on('dtlsstatechange', state => {
      this.logger.debug(`🎉 ${data.test} WebRTC 연결 성립 : transportId=${webRtcTransport.id} 연결 성공`);
    });

    await webRtcTransport.connect({ dtlsParameters: data.dtlsParameters });

    this.logger.debug(`✅ 웹 RTC 트랜스포트 연결 완료: ${webRtcTransport.id}`);

    return { success: true };
  }

  /**
   * 프로듀서 생성 및 다른 클라이언트에게 알림
   */
  @SubscribeMessage('client:produce')
  async handleProduce(
    @ConnectedSocket() client: CustomSocket,
    @MessageBody()
    data: {
      roomId: string;
      transportId: string;
      kind: 'audio' | 'video';
      rtpParameters: any;
      trackType: 'audio' | 'video' | 'screen';
    }
  ) {
    try {
      const userKey = client.userKey;
      // 1. Producer 생성
      const producer = await this.mediasoupService.createProducer(
        data.roomId,
        userKey,
        data.transportId,
        data.kind,
        data.rtpParameters,
        data.trackType
      );
      // 프로듀서 생성했을때 다른 트랜스 포트가 준비된 유저에게 프로듀서 전달
      const producers = [
        {
          producerId: producer?.id,
          userId: userKey,
          trackType: data.trackType,
        },
      ];

      client.to(`room:${data.roomId}`).emit('server:new_producer', producers);
      this.logger.log(`✅ 프로듀서 생성 및 알림 완료: ${producer?.id} (Room: ${data.roomId})`);

      return { success: true, producerId: producer?.id, roomId: data.roomId };
    } catch (error) {
      this.logger.error('❌ 프로듀서 생성 실패:', error);
      client.emit('server:produced', { success: false, error: error.message });
    }
  }

  /**
   * 프로듀서 요청 - 해당 방의 모든 프로듀서를 자신을 제외하고 전달
   */
  @SubscribeMessage('client:get_producers')
  async handleGetProducers(@ConnectedSocket() client: CustomSocket, @MessageBody() data: { roomId: string }) {
    try {
      const { roomId } = data;
      const userKey = client.userKey;

      // 해당 방의 모든 프로듀서 조회
      const allProducers = this.mediasoupService.getProducersByRoom(roomId);
      // 자신의 프로듀서는 제외하고 필터링
      const otherProducers = allProducers.filter(producerInfo => producerInfo.userKey !== userKey);

      // 클라이언트가 필요한 형태로 변환
      const producers = otherProducers.map(producerInfo => ({
        producerId: producerInfo.producer.id,
        userId: producerInfo.userKey,
        trackType: producerInfo.trackType, // 아 개빡친다 여기 이거 땜에 ..
      }));
      // emit으로 직접 클라이언트에게 전달
      if (producers.length > 0) {
        this.logger.log(`📋📋📋 프로듀서 목록 전달: ${userKey} 에게 ${producers.length}개 프로듀서 (방: ${roomId})`);
        client.emit('server:new_producer', producers);
      }
    } catch (error) {
      this.logger.error(`❌ 프로듀서 조회 실패: ${error.message}`);
    }
  }

  /**
   * 컨슈머 생성 및 클라이언트에 전달
   */
  @SubscribeMessage('client:consume')
  async handleConsume(
    @ConnectedSocket() client: CustomSocket,
    @MessageBody()
    data: {
      roomId: string;
      producerId: string;
      rtpCapabilities: mediasoupTypes.RtpCapabilities;
      transportId: string;
      trackType: 'audio' | 'video' | 'screen';
    }
  ) {
    try {
      const userKey = client.userKey; // 소비자(요청자)의 userKey

      // producerId 유효성 검사
      if (!data.producerId) {
        this.logger.error(`❌ producerId가 없습니다: ${JSON.stringify(data)}`);
        return { success: false, error: 'producerId가 필요합니다.' };
      }

      // RTP Capabilities 호환성 체크
      const canConsume = this.mediasoupService.canConsume(data.producerId, data.rtpCapabilities);

      if (!canConsume) {
        this.logger.error(`❌ RTP Capabilities 호환성 실패: producerId=${data.producerId}`);
        return { success: false, error: 'RTP Capabilities가 호환되지 않습니다.' };
      }

      const consumer = await this.mediasoupService.createConsumer(
        data.roomId,
        userKey,
        data.producerId,
        data.rtpCapabilities,
        data.transportId,
        data.trackType
      );

      this.logger.debug(`✅ 컨슈머 생성 및 전달 완료: ${consumer?.id}`);

      return {
        success: true,
        consumerId: consumer?.id,
        producerId: data.producerId,
        kind: consumer.kind,
        rtpParameters: consumer?.rtpParameters,
        trackType: data.trackType,
      };
    } catch (error) {
      this.logger.error('❌ 컨슈머 생성 실패:', error.message);
      client.emit('server:consumed', { success: false, error: error.message });
    }
  }

  /**
   * Producer 정지 요청
   */
  @SubscribeMessage('client:producer_pause')
  async handleProducerPause(
    @ConnectedSocket() client: CustomSocket,
    @MessageBody() data: { roomId: string; trackType: 'audio' | 'video' }
  ) {
    const { roomId, trackType } = data;
    const userKey = client.userKey;
    const userName = client.userName;

    if (!userKey) {
      return { success: false, error: '인증되지 않은 사용자입니다.' };
    }

    try {
      // Mediasoup에서 producer 정지
      await this.mediasoupService.pauseProducer(roomId, userKey, trackType);

      // 같은 룸의 다른 유저들에게 producer 정지 알림
      client.to(`room:${roomId}`).emit('server:producer_paused', {
        userId: userKey,
        userName,
        trackType,
        timestamp: getKoreanTimeFormatted(),
      });

      // console.log('client.rooms', client.rooms.entries());
      // 이부분 계속 헤맸는데 SET은 entries()했을때 key, value가 똑같음
      // 그리고 처음은 socket.io에서 자동으로 생성한 것임
      //   nestjs-app-dev  | client.rooms [Set Entries] {
      //   nestjs-app-dev  |   [ '3qI0CPbegFs6kWVKAAAB', '3qI0CPbegFs6kWVKAAAB' ],
      //   nestjs-app-dev  |   [
      //   nestjs-app-dev  |     'room:8c50f426-0744-4a28-88a9-9da8b0a65c66',
      //   nestjs-app-dev  |     'room:8c50f426-0744-4a28-88a9-9da8b0a65c66'
      //   nestjs-app-dev  |   ]
      //   nestjs-app-dev  | }

      this.logger.log(`⏸️ Producer 정지: ${userName} (${trackType}) in ${roomId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Producer 정지 실패: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Producer 재개 요청
   */
  @SubscribeMessage('client:producer_resume')
  async handleProducerResume(
    @ConnectedSocket() client: CustomSocket,
    @MessageBody() data: { roomId: string; trackType: 'audio' | 'video' }
  ) {
    const { roomId, trackType } = data;
    const userKey = client.userKey;
    const userName = client.userName;

    if (!userKey) {
      return { success: false, error: '인증되지 않은 사용자입니다.' };
    }

    try {
      // Mediasoup에서 producer 재개
      await this.mediasoupService.resumeProducer(roomId, userKey, trackType);

      // 같은 룸의 다른 유저들에게 producer 재개 알림
      client.to(`room:${roomId}`).emit('server:producer_resumed', {
        userId: userKey,
        userName,
        trackType,
        timestamp: getKoreanTimeFormatted(),
      });

      this.logger.log(`▶️ Producer 재개: ${userName} (${trackType}) in ${roomId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Producer 재개 실패: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 상대방 음소커 ON
   */
  @SubscribeMessage('client:volume_mute_on')
  async handleVolumeMuteOn(@ConnectedSocket() client: CustomSocket, @MessageBody() data: { roomId: string }) {
    const { roomId } = data;
    const userKey = client.userKey;
    const userName = client.userName;

    // 같은 룸의 다른 유저들에게 음소커 ON 알림
    client.to(`room:${roomId}`).emit('server:volume_mute_on', {
      userId: userKey,
      userName,
    });

    this.logger.log(`🔇 음소커 ON: ${userName} in ${roomId}`);

    return { success: true, message: '음소커 ON 완료' };
  }

  /**
   * 상대방 음소거 OFF
   */
  @SubscribeMessage('client:volume_mute_off')
  async handleVolumeMuteOff(@ConnectedSocket() client: CustomSocket, @MessageBody() data: { roomId: string }) {
    const { roomId } = data;
    const userKey = client.userKey;
    const userName = client.userName;

    // 같은 룸의 다른 유저들에게 음소거 OFF 알림
    client.to(`room:${roomId}`).emit('server:volume_mute_off', {
      userId: userKey,
      userName,
    });

    this.logger.log(`🔊 음소거 OFF: ${userName} in ${roomId}`);

    return { success: true, message: '음소거 OFF 완료' };
  }

  @SubscribeMessage('client:screen_share_start')
  async handleScreenShareStart(@ConnectedSocket() client: CustomSocket, @MessageBody() data: { roomId: string }) {
    const { roomId } = data;
    const userKey = client.userKey;
    const userName = client.userName;

    client.to(`room:${roomId}`).emit('server:screen_share_start', {
      userId: userKey,
      userName,
    });

    this.logger.log(`📺 화면 공유 시작: ${userName} in ${roomId}`);

    return { success: true, message: '화면 공유 시작 완료' };
  }

  @SubscribeMessage('client:screen_share_stop')
  async handleScreenShareStop(@ConnectedSocket() client: CustomSocket, @MessageBody() data: { roomId: string }) {
    const { roomId } = data;
    const userKey = client.userKey;
    const userName = client.userName;

    client.to(`room:${roomId}`).emit('server:screen_share_stop', {
      userId: userKey,
      userName,
    });

    this.logger.log(`📺 화면 공유 종료: ${userName} in ${roomId}`);

    return { success: true, message: '화면 공유 종료 완료' };
  }

  /**
   * 매칭 종료
   */
  @SubscribeMessage('client:mediasoup_end')
  async handleDeleteMatch(@ConnectedSocket() client: CustomSocket, @MessageBody() data: { roomId: string }) {
    const { roomId } = data;
    const userKey = client.userKey;
    const userName = client.userName;

    this.logger.log(`✅ 매칭 종료: ${userKey} -> ${roomId}`);

    try {
      // 1. 룸에서 나가기
      await client.leave(`room:${roomId}`);

      // const roomMemberCount = await this.mediasoupService.getRoomMemberCount(roomId);
      // this.logger.debug('🔍 roomMemberCount:', roomMemberCount);

      // 2. 사용자 퇴장
      await this.mediasoupService.handleUserLeave(userKey, userName, roomId);

      // 3. Redis에서 방 관련 데이터 삭져
      this.redisService.del(`${this.MEDIASOUP_ROOM_KEY}${userKey}`);

      this.logger.log(`✅ 매칭 종료 및 리소스 정리 완료: ${userKey} -> ${roomId}`);

      return {
        success: true,
        message: '매칭 종료 성공',
      };
    } catch (error) {
      this.logger.error('❌ 매칭 종료 실패:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
