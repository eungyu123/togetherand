// prettier-ignore
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/chat.dto';
import { Logger } from '@nestjs/common';
// Cron import 제거 - Redis TTL 기반 자동 만료 사용
import { MessageType } from './entities/chat-message.entity';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { FriendsService } from '../friends/friends.service';
import { getKoreanTimeFormatted } from 'src/common/utils/date.util';
import { MediasoupService } from '../mediasoup/mediasoup.service';
import { MediasoupGateway } from '../mediasoup/mediasoup.gateway';
import { CallService } from '../call/call.service';

interface CustomSocket extends Socket {
  userId: string;
  userName: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  path: '/socket.io',
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly CHAT_SOCKET_KEY = 'chat:socket:user:';
  private readonly CHAT_ROOM_KEY = 'chat:room:key:';

  /**
   * userId로 연결된 소켓 찾기
   */
  private async findSocketByUserId(userId: string): Promise<any> {
    const sockets = await this.server.fetchSockets();
    for (const socket of sockets) {
      if (socket.data.userId === userId || socket.handshake.auth.userId === userId) {
        return socket;
      }
    }
    return null;
  }

  /**
   * userId가 온라인인지 확인
   */
  private async isUserOnline(userId: string): Promise<boolean> {
    const socket = await this.findSocketByUserId(userId);
    return socket !== null;
  }

  constructor(
    private readonly chatService: ChatService,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
    private readonly friendsService: FriendsService,
    private readonly mediasoupService: MediasoupService,
    private readonly mediasoupGateway: MediasoupGateway,
    private readonly callService: CallService
  ) {}

  async handleConnection(client: CustomSocket) {
    try {
      const userId = client.handshake.auth.userId;
      if (!userId) {
        this.logger.error('User ID를 찾을 수 없습니다.');
        client.disconnect();
        return;
      }
      // CallService에 서버 참조 설정
      this.callService.setServer(this.server);

      // MediasoupService에 서버 참조 설정
      this.mediasoupService.setServer(this.mediasoupGateway.server);

      // 소켓에 userId 저장 (나중에 식별용)
      const user = await this.usersService.findById(userId);
      client.userId = userId;
      client.userName = user.userName;
      client.data.userId = userId; // data에 저장하거나 client.userId를 사용 나중에 정리해야함.. ㅋㅋ
      client.data.userName = user.userName;

      // Redis에 온라인 상태 저장
      await this.redisService.setUserOnlineStatus(userId, 'online');

      // 사용자의 채팅방 목록을 가져와서 각 방에 조인
      const userRooms = await this.chatService.getUserChatRooms(userId);
      for (const room of userRooms) {
        client.join(`room:${room.id}`);
        this.logger.debug(`✅ 채팅방 조인: ${room.id} (${room.name})`);
      }

      // 친구들에게 온라인 상태 알림
      await this.notifyFriendsOnlineStatus(userId, 'online');
      this.logger.log(`✅ 채팅 소켓 연결 완료`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: CustomSocket) {
    try {
      const userId = client.handshake.auth.userId || client.userId;

      // Redis에서 오프라인 상태 설정
      await this.redisService.setUserOffline(userId);

      // 친구들에게 오프라인 상태 알림
      await this.notifyFriendsOnlineStatus(userId, 'offline');

      // 이거 자동으로 나가져서 안해도됨
      // await client.leave(`room:${roomId}`);

      // 화상통화 종료 처리
      const roomId = (await this.redisService.get(`user:call:active:${userId}`)).roomId;
      await this.callService.handleCallEnd(client, roomId);
    } catch (error) {
      this.logger.error('Disconnect error:', error);
    }
  }

  /**
   * 친구들에게 온라인/오프라인 상태 알림
   */
  private async notifyFriendsOnlineStatus(userId: string, status: 'online' | 'offline'): Promise<void> {
    try {
      // 사용자 정보 조회
      const user = await this.usersService.findById(userId);
      if (!user) return;

      // 실제 친구 목록만 조회
      const friendsResponse = await this.friendsService.getFriends(userId);
      const friendIds = friendsResponse.friends.map(friend => friend.id);

      // 온라인 상태인 친구들만 필터링
      const onlineFriendIds: string[] = [];
      for (const friendId of friendIds) {
        if (await this.isUserOnline(friendId)) {
          onlineFriendIds.push(friendId);
        }
      }

      // 친구들에게만 상태 변경 알림
      for (const friendId of onlineFriendIds) {
        const socket = await this.findSocketByUserId(friendId);
        if (socket) {
          socket.emit('friend:status-change', {
            userId,
            userName: user.userName,
            status,
            timestamp: getKoreanTimeFormatted(),
          });
        }
      }

      this.logger.debug(` ${onlineFriendIds.length} 친구에게 ${userId} 상태 변경 알림: ${status}`);
    } catch (error) {
      this.logger.error(`Failed to notify friends about status change: ${userId}`, error);
    }
  }

  /**
   * 채팅방 구독
   */
  @SubscribeMessage('subscribe-room')
  async handleSubscribeRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const userId = client.handshake.auth.userId;
    const { roomId } = data;

    // 입력값 검증
    if (!roomId) {
      this.logger.error(`subscribe-room 실패: 잘못된 roomId: ${roomId}, `);

      return { success: false, message: 'subscribe-room 실패: 유효하지 않은 채팅방 ID입니다.' };
    }

    this.logger.debug(`유저 ${userId} 채팅방 ${roomId} 구독 시작`);
    try {
      // 사용자가 해당 채팅방의 멤버인지 확인
      const isMember = await this.chatService.isRoomMember(userId, roomId);
      if (!isMember) {
        this.logger.error(`subscribe-room 실패: 유저 ${userId} 채팅방 ${roomId} 접근 권한이 없습니다.`);
        return { success: false, message: 'subscribe-room 실패: 채팅방에 접근할 권한이 없습니다.' };
      }

      client.join(`room:${roomId}`);

      // 조인 후 룸 상태 확인
      const roomSockets = await this.server.in(`room:${roomId}`).fetchSockets();
      this.logger.log(`✅ 채팅방 구독 완료: ${userId} `);

      return { success: true, roomId };
    } catch (error) {
      this.logger.error(`subscribe-room 실패: 유저 ${userId} 채팅방 ${roomId} 구독 실패:`, error);
      return { success: false, message: 'subscribe-room 실패: 채팅방 구독 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 채팅방 구독 해제
   */
  @SubscribeMessage('unsubscribe-room')
  async handleUnsubscribeRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const { roomId } = data;

    // 입력값 검증
    if (!roomId) {
      this.logger.error(`unsubscribe-room 실패: 잘못된 roomId: ${roomId}`);
      return { success: false, message: 'unsubscribe-room 실패: 유효하지 않은 채팅방 ID입니다.' };
    }

    client.leave(`room:${roomId}`);
    client.emit('unsubscribed:room', { roomId });
    return { success: true, message: 'unsubscribe-room 완료: 채팅방 구독 해제 완료' };
  }

  /**
   * 메시지 전송
   */
  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      content: string;
      type: MessageType;
    }
  ) {
    const userId = client.handshake.auth.userId;
    const { roomId, content, type } = data;

    try {
      const sendMessageDto: SendMessageDto = {
        roomId: roomId,
        content,
        type,
      };

      // 메시지 저장 (안읽은 카운트도 함께 증가)
      const message = await this.chatService.sendMessage(userId, sendMessageDto);
      this.logger.debug(`✅ 메시지 저장 완료: ${JSON.stringify(message)}`);

      this.server.to(`room:${roomId}`).emit('message-received', message);
      this.logger.log(`메시지 브로드캐스트 완료: ${userId} in room ${roomId}`);

      return { success: true, message: message };
    } catch (error) {
      this.logger.error('Send message error:', error);
      return { success: false, message: 'send-message 실패: 메시지 전송 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 타이핑 시작
   */
  @SubscribeMessage('typing-start')
  async handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const userId = client.handshake.auth.userId;
    const { roomId } = data;

    try {
      // 사용자 정보 조회
      const user = await this.usersService.findById(userId);

      // 같은 방의 다른 사용자들에게 타이핑 상태 전송
      client.to(`room:${roomId}`).emit('user-typing', {
        userId,
        userName: user.userName,
        isTyping: true,
        roomId,
      });
    } catch (error) {
      this.logger.error('Typing start error:', error);
    }
  }

  /**
   * 타이핑 중지
   */
  @SubscribeMessage('typing-stop')
  async handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const userId = client.handshake.auth.userId;
    const { roomId } = data;

    try {
      // 사용자 정보 조회
      const user = await this.usersService.findById(userId);

      // 타이핑 중지 상태 전송
      client.to(`room:${roomId}`).emit('user-typing', {
        userId,
        userName: user.userName,
        isTyping: false,
        roomId,
      });
    } catch (error) {
      this.logger.error('Typing stop error:', error);
    }
  }

  /**
   * 메시지 읽음 처리
   */
  @SubscribeMessage('mark-messages-read')
  async handleMarkMessagesRead(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const userId = client.handshake.auth.userId;
    const { roomId } = data;

    try {
      // 메시지 읽음 처리
      this.logger.debug(`메시지 읽음 처리 시작: userId=${userId}, roomId=${roomId}`);

      await this.chatService.markMessagesAsRead(userId, roomId);

      this.logger.debug(`✅ 메시지 읽음 처리 완료: userId=${userId}, roomId=${roomId}`);
      return { success: true, message: '메시지 읽음 처리 완료' };
    } catch (error) {
      this.logger.error('Mark messages read error:', error);
      return { success: false, message: '메시지 읽음 처리 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 안읽은 메시지 카운트 조회
   */
  @SubscribeMessage('get-unread-counts')
  async handleGetUnreadCounts(@ConnectedSocket() client: Socket) {
    const userId = client.handshake.auth.userId;

    try {
      const unreadCounts = await this.chatService.getUnreadCounts(userId);

      return { success: true, unreadCounts };
    } catch (error) {
      this.logger.error('Get unread counts error:', error);
      return { success: false, message: '안읽은 메시지 카운트 조회 중 오류가 발생했습니다.' };
    }
  }

  // ==================== 화상통화 관련 이벤트 ====================

  /**
   * 화상통화 요청
   */
  @SubscribeMessage('call:request')
  async handleCallRequest(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    try {
      return await this.callService.handleCallRequest(client, data);
    } catch (error) {
      this.logger.error('Call request error:', error);
      return { success: false, message: error.message || '화상통화 요청 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 화상통화 응답 (수락/거절)
   */
  @SubscribeMessage('call:response')
  async handleCallResponse(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callerId: string; accepted: boolean; roomId: string }
  ) {
    return this.callService.handleCallResponse(client, data);
  }

  /**
   * 화상통화 종료
   */
  @SubscribeMessage('call:end')
  async handleCallEnd(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    // 화상통화 종료 시 룸에서 나가기
    // await client.leave(`room:${data.roomId}`); // 이거 하면 안되는게 그 각 채팅방에 조인한 상태임 그래야 그 문자 메시지 받음

    // 화상통화 종료 처리
    return this.callService.handleCallEnd(client, data.roomId);
  }

  // 크론 작업 제거 - Redis TTL로 자동 만료 처리

  /**
   * 대기 중인 화상통화 요청 확인 (사용자 접속 시)
   */
  @SubscribeMessage('call:check:pending')
  async checkPendingCallRequest(@ConnectedSocket() client: Socket, @MessageBody() data: {}) {
    return this.callService.checkPendingCallRequest(client);
  }

  /**
   * 기존 참여자 정보 조회
   */
  @SubscribeMessage('call:check:existing')
  async checkExistingParticipants(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    return this.callService.checkExistingParticipants(client, data.roomId);
  }
}
