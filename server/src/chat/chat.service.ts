import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { ChatRoom, ChatRoomType } from './entities/chat-room.entity';
import { ChatMessage, MessageType } from './entities/chat-message.entity';
import { ChatRoomMember, MemberRole } from './entities/chat-room-member.entity';
import { User } from '../users/entities/user.entity';
// prettier-ignore
import { CreateChatRoomDto, SendMessageDto, UpdateChatRoomDto, ChatRoomResponseDto, ChatMessageResponseDto, ChatRoomMemberResponseDto } from './dto/chat.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(ChatRoomMember)
    private readonly chatRoomMemberRepository: Repository<ChatRoomMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource
  ) {}

  /**
   * 새로운 채팅방 생성
   */
  async createChatRoom(userId: string, createChatRoomDto: CreateChatRoomDto): Promise<ChatRoomResponseDto> {
    const { name, type, imageUrl, memberIds = [] } = createChatRoomDto;

    // 자기 자신의 ID를 제거하고 실제 상대방 ID만 추출
    const filteredMemberIds = memberIds.filter(id => id !== userId);

    this.logger.log(`새로운 채팅방 생성 시작: ${userId}, ${name}, ${type}, ${filteredMemberIds}`);

    // 1:1 채팅의 경우 상대방이 1명이어야 함 (자기 자신 제외)
    if (type === ChatRoomType.DIRECT && filteredMemberIds.length !== 1) {
      throw new ForbiddenException('1:1 채팅은 상대방 1명이 필요합니다.');
    }

    // 기존 1:1 채팅방이 있는지 확인
    if (type === ChatRoomType.DIRECT) {
      const existingRoom = await this.findDirectChatRoom(userId, filteredMemberIds[0]);
      if (existingRoom) {
        return this.mapToChatRoomResponse(existingRoom, userId);
      }
    }

    // 채팅방 생성 - Entity 속성명에 맞게 수정
    const chatRoom = this.chatRoomRepository.create({
      name,
      type,
      imageUrl,
      creator: { id: userId }, // createdBy → creator
    });

    const savedRoom = await this.chatRoomRepository.save(chatRoom);

    // 생성자를 방장으로 추가
    await this.addMemberToRoom(savedRoom.id, userId, MemberRole.OWNER);

    // 다른 멤버들 추가
    for (const memberId of filteredMemberIds) {
      await this.addMemberToRoom(savedRoom.id, memberId, MemberRole.MEMBER);
    }

    this.logger.log(`채팅방 생성 완료: ${savedRoom.id}`);

    // 생성된 채팅방의 멤버 확인
    const members = await this.chatRoomMemberRepository.find({
      where: { roomId: savedRoom.id },
    });

    this.logger.log(
      `채팅방 멤버 수: ${members.length}`,
      members.map(m => ({ userId: m.userId, role: m.role }))
    );

    return this.mapToChatRoomResponse(savedRoom, userId);
  }

  /**
   * 1:1 채팅방 찾기
   */
  async findDirectChatRoom(userId1: string, userId2: string): Promise<ChatRoom | null> {
    const room = await this.chatRoomRepository
      .createQueryBuilder('room')
      .innerJoin('chat_room_members', 'member1', 'member1.chat_room_id = room.id AND member1.user_id = :userId1', {
        userId1,
      })
      .innerJoin('chat_room_members', 'member2', 'member2.chat_room_id = room.id AND member2.user_id = :userId2', {
        userId2,
      })
      .where('room.type = :type', { type: ChatRoomType.DIRECT })
      .getOne();

    return room;
  }

  /**
   * 채팅방 멤버 추가
   */
  async addMemberToRoom(roomId: string, userId: string, role: MemberRole = MemberRole.MEMBER): Promise<void> {
    const existingMember = await this.chatRoomMemberRepository.findOne({
      where: { roomId: roomId, userId },
    });

    if (existingMember) {
      return; // 이미 멤버인 경우
    }

    const member = this.chatRoomMemberRepository.create({
      roomId: roomId,
      userId,
      role,
    });

    await this.chatRoomMemberRepository.save(member);
  }

  /**
   * 메시지 전송
   */
  async sendMessage(userId: string, sendMessageDto: SendMessageDto): Promise<ChatMessageResponseDto> {
    const { roomId, content, type = MessageType.TEXT } = sendMessageDto;

    // 채팅방 멤버인지 확인
    const isMember = await this.isRoomMember(userId, roomId);
    if (!isMember) {
      throw new ForbiddenException('채팅방에 접근할 권한이 없습니다.');
    }

    // 트랜잭션으로 메시지 저장 및 안읽은 카운트 증가
    const result = await this.dataSource.transaction(async manager => {
      // 메시지 생성
      const message = manager.create(ChatMessage, {
        roomId,
        senderId: userId,
        content,
        type,
      });

      // 메시지 저장
      const savedMessage = await manager.save(ChatMessage, message);
      this.logger.log(`✅ 메시지 저장 완료: id=${savedMessage.id}, createdAt=${savedMessage.createdAt}`);

      // 안읽은 메시지 카운트 증가 (자신 제외)
      await manager
        .createQueryBuilder()
        .update(ChatRoomMember)
        .set({ unreadCount: () => 'unread_count + 1' })
        .where('roomId = :roomId', { roomId })
        .andWhere('userId != :senderId', { senderId: userId })
        .execute();

      this.logger.log(`📈 안읽은 메시지 카운트 증가 완료: roomId=${roomId}, senderId=${userId}`);

      // sender 관계를 포함해서 메시지 다시 조회
      const messageWithSender = await manager.findOne(ChatMessage, {
        where: { id: savedMessage.id },
        relations: ['sender'],
      });

      if (!messageWithSender) {
        this.logger.error(`❌ 저장된 메시지 조회 실패: id=${savedMessage.id}`);
        throw new Error('Failed to retrieve saved message');
      }

      this.logger.log(
        `📤 메시지 전송 완료: id=${messageWithSender.id}, sender=${messageWithSender.sender?.userName}, content="${messageWithSender.content}"`
      );

      return messageWithSender;
    });

    // 트랜잭션 완료 후 즉시 조회 테스트
    this.logger.debug(`🧪 트랜잭션 완료 후 즉시 조회 테스트 시작`);
    const immediateCheck = await this.chatMessageRepository.count({
      where: { roomId },
    });
    this.logger.debug(`🧪 즉시 조회 결과: roomId=${roomId}, 메시지 수=${immediateCheck}`);

    return this.mapToChatMessageResponse(result);
  }

  /**
   * 채팅방 메시지 목록 조회
   */
  async getRoomMessages(
    roomId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<ChatMessageResponseDto[]> {
    // 채팅방 멤버인지 확인
    const isMember = await this.isRoomMember(userId, roomId);
    if (!isMember) {
      throw new ForbiddenException('채팅방에 접근할 권한이 없습니다.');
    }

    // READ COMMITTED 격리 수준으로 메시지 조회
    const messages = await this.dataSource.transaction('READ COMMITTED', async manager => {
      return await manager.find(ChatMessage, {
        where: { roomId: roomId },
        relations: ['sender'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
    });

    this.logger.debug(`📨 조회된 메시지 수: ${messages.length}개`);

    const result = messages.map(message => this.mapToChatMessageResponse(message));
    this.logger.log(`✅ 메시지 조회 완료: ${result.length}개 반환`);

    return result;
  }

  /**
   * 사용자의 채팅방 목록 조회
   */
  async getUserChatRooms(userId: string): Promise<ChatRoomResponseDto[]> {
    // 먼저 사용자가 속한 채팅방 ID들을 조회
    const memberRooms = await this.chatRoomMemberRepository.find({
      where: { userId },
      select: ['roomId'],
    });

    const roomIds = memberRooms.map(member => member.roomId);

    if (roomIds.length === 0) {
      this.logger.debug(`사용자의 채팅방 목록 조회: ${userId}, 0개`);
      return [];
    }

    // 채팅방 정보 조회
    const rooms = await this.chatRoomRepository.find({
      where: { id: In(roomIds) },
      order: { updatedAt: 'DESC' },
    });

    this.logger.debug(`사용자의 채팅방 목록 조회: ${userId}, ${rooms.length}개`);

    return Promise.all(rooms.map(room => this.mapToChatRoomResponse(room, userId)));
  }

  /**
   * 채팅방 멤버 목록 조회
   */
  async getRoomMembers(roomId: string, userId: string): Promise<ChatRoomMemberResponseDto[]> {
    // 채팅방 멤버인지 확인
    const isMember = await this.isRoomMember(userId, roomId);
    if (!isMember) {
      throw new ForbiddenException('채팅방에 접근할 권한이 없습니다.');
    }

    const members = await this.chatRoomMemberRepository.find({
      where: { roomId: roomId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return members.map(member => this.mapToChatRoomMemberResponse(member));
  }

  /**
   * 채팅방 멤버인지 확인
   */
  async isRoomMember(userId: string, roomId: string): Promise<boolean> {
    const member = await this.chatRoomMemberRepository.findOne({
      where: { roomId: roomId, userId },
    });
    return !!member;
  }

  /**
   * 메시지 읽음 처리 (안읽은 카운트 초기화)
   */
  async markMessagesAsRead(userId: string, roomId: string): Promise<void> {
    // 채팅방 멤버인지 확인
    const isMember = await this.isRoomMember(userId, roomId);
    if (!isMember) {
      throw new ForbiddenException('채팅방에 접근할 권한이 없습니다.');
    }

    // 안읽은 카운트 초기화
    await this.chatRoomMemberRepository.update({ userId, roomId }, { unreadCount: 0 });

    this.logger.debug(`✅ 메시지 읽음 처리 완료: userId=${userId}, roomId=${roomId}`);
  }

  /**
   * 사용자의 안읽은 메시지 카운트 조회
   */
  async getUnreadCounts(userId: string): Promise<Record<string, number>> {
    const members = await this.chatRoomMemberRepository.find({
      where: { userId },
      select: ['roomId', 'unreadCount'],
    });

    const unreadCounts: Record<string, number> = {};
    members.forEach(member => {
      unreadCounts[member.roomId] = member.unreadCount;
    });

    return unreadCounts;
  }

  /**
   * 특정 방의 안읽은 메시지 카운트 조회
   */
  async getRoomUnreadCount(userId: string, roomId: string): Promise<number> {
    const member = await this.chatRoomMemberRepository.findOne({
      where: { userId, roomId },
      select: ['unreadCount'],
    });

    return member?.unreadCount || 0;
  }

  // 추가된 부분 내일 확인하기

  /**
   * 채팅방 수정
   */
  async updateChatRoom(
    roomId: string,
    userId: string,
    updateChatRoomDto: UpdateChatRoomDto
  ): Promise<ChatRoomResponseDto> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: roomId },
    });

    if (!chatRoom) {
      throw new NotFoundException('❌ 채팅방을 찾을 수 없습니다.');
    }

    // 권한 확인 (방장 또는 관리자만 수정 가능)
    const member = await this.chatRoomMemberRepository.findOne({
      where: { roomId: roomId, userId },
    });

    // 권한 설정은 그냥 나중에 해야겠음
    // if (!member || (member.role !== MemberRole.OWNER && member.role !== MemberRole.ADMIN)) {
    // throw new ForbiddenException('❌ 채팅방을 수정할 권한이 없습니다.');
    // }

    // 채팅방 정보 업데이트
    const { name, imageUrl } = updateChatRoomDto;
    if (name !== undefined) chatRoom.name = name;
    if (imageUrl !== undefined) chatRoom.imageUrl = imageUrl;

    const updatedRoom = await this.chatRoomRepository.save(chatRoom);

    this.logger.log(`채팅방 수정 완료: ${roomId}, ${name || '이름 변경 없음'}, ${imageUrl || '이미지 변경 없음'}`);

    return this.mapToChatRoomResponse(updatedRoom, userId);
  }

  /**
   * 채팅방 멤버 삭제
   */
  async removeMemberFromRoom(roomId: string, targetUserId: string, requesterId: string): Promise<void> {
    // 채팅방 존재 확인
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: roomId },
    });

    if (!chatRoom) {
      throw new NotFoundException('❌ 채팅방을 찾을 수 없습니다.');
    }

    // 요청자 권한 확인
    const requesterMember = await this.chatRoomMemberRepository.findOne({
      where: { roomId: roomId, userId: requesterId },
    });

    if (!requesterMember) {
      throw new ForbiddenException('❌ 채팅방에 접근할 권한이 없습니다.');
    }

    // 대상 멤버 확인
    const targetMember = await this.chatRoomMemberRepository.findOne({
      where: { roomId: roomId, userId: targetUserId },
    });

    if (!targetMember) {
      throw new NotFoundException('❌ 해당 사용자가 채팅방에 존재하지 않습니다.');
    }

    // 권한 확인 (방장만 멤버 삭제 가능, 방장은 자신을 삭제할 수 없음)
    if (requesterMember.role !== MemberRole.OWNER) {
      throw new ForbiddenException('❌ 멤버를 삭제할 권한이 없습니다.');
    }

    if (targetUserId === requesterId) {
      throw new ForbiddenException('❌ 방장은 자신을 삭제할 수 없습니다.');
    }

    // 멤버 삭제
    await this.chatRoomMemberRepository.remove(targetMember);

    this.logger.log(`채팅방 멤버 삭제 완료: ${roomId}, ${targetUserId}`);
  }

  /**
   * 채팅방 삭제
   */
  async deleteChatRoom(roomId: string, userId: string): Promise<void> {
    // 채팅방 존재 확인
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: roomId },
    });

    if (!chatRoom) {
      throw new NotFoundException('❌ 채팅방을 찾을 수 없습니다.');
    }

    // 권한 확인 (방장만 삭제 가능)
    const member = await this.chatRoomMemberRepository.findOne({
      where: { roomId: roomId, userId },
    });

    if (!member || member.role !== MemberRole.OWNER) {
      throw new ForbiddenException('❌ 채팅방을 삭제할 권한이 없습니다.');
    }

    // 채팅방 삭제 (CASCADE로 관련 데이터도 함께 삭제됨)
    await this.chatRoomRepository.remove(chatRoom);

    this.logger.log(`채팅방 삭제 완료: ${roomId}`);
  }

  /**
   * 채팅방 나가기
   */
  async leaveChatRoom(roomId: string, userId: string): Promise<void> {
    // 채팅방 존재 확인
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: roomId },
    });

    if (!chatRoom) {
      throw new NotFoundException('❌ 채팅방을 찾을 수 없습니다.');
    }

    // 멤버 확인
    const member = await this.chatRoomMemberRepository.findOne({
      where: { roomId: roomId, userId },
    });

    if (!member) {
      throw new NotFoundException('❌ 해당 사용자가 채팅방에 존재하지 않습니다.');
    }

    // 방장이 나가는 경우 채팅방 삭제
    if (member.role === MemberRole.OWNER) {
      // 방장이 나가면 채팅방 전체 삭제
      await this.chatRoomRepository.remove(chatRoom);
      this.logger.log(`방장이 나가서 채팅방 삭제됨: ${roomId}, ${userId}`);
      return;
    }

    // 일반 멤버는 제거
    await this.chatRoomMemberRepository.remove(member);

    // 남은 멤버가 1명 이하인 경우 채팅방 삭제
    const remainingMembers = await this.chatRoomMemberRepository.count({
      where: { roomId: roomId },
    });

    if (remainingMembers <= 1) {
      await this.chatRoomRepository.remove(chatRoom);
      this.logger.log(`멤버 부족으로 채팅방 삭제됨: ${roomId}, 남은 멤버: ${remainingMembers}`);
      return;
    }

    this.logger.log(`채팅방 나가기 완료: ${roomId}, ${userId}, 남은 멤버: ${remainingMembers}`);
  }

  /**
   * ChatRoom 엔티티를 ChatRoomResponseDto로 변환하는 메서드
   */
  private async mapToChatRoomResponse(room: ChatRoom, currentUserId?: string): Promise<ChatRoomResponseDto> {
    const memberCount = await this.chatRoomMemberRepository.count({
      where: { roomId: room.id },
    });

    // 현재 사용자의 안읽은 메시지 카운트 조회
    let unreadCount = 0;
    if (currentUserId) {
      unreadCount = await this.getRoomUnreadCount(currentUserId, room.id);
    }

    // 1:1 채팅방인 경우 이미지가 없으면 현재 사용자 기준으로 상대방의 프로필 이미지를 사용
    let finalImageUrl = room.imageUrl;
    if (room.type === ChatRoomType.DIRECT && currentUserId && !finalImageUrl) {
      const members = await this.chatRoomMemberRepository.find({
        where: { roomId: room.id },
        relations: ['user'],
      });

      // 현재 사용자가 아닌 상대방 찾기
      const opponent = members.find(member => member.user && member.user.id !== currentUserId);
      if (opponent?.user?.photoUrl) {
        finalImageUrl = opponent.user.photoUrl;
      }
    }

    return {
      id: room.id,
      name: room.name,
      type: room.type,
      imageUrl: finalImageUrl,
      createdBy: room.creator?.id || '',
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      memberCount,
      unreadCount,
    };
  }

  /**
   * ChatMessage 엔티티를 ChatMessageResponseDto로 변환하는 메서드
   */
  private mapToChatMessageResponse(message: ChatMessage): ChatMessageResponseDto {
    return {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      senderName: message.sender.userName,
      photoUrl: message.sender.photoUrl,
      type: message.type,
      content: message.content,
      createdAt: message.createdAt,
    };
  }

  /**
   * ChatRoomMember 엔티티를 ChatRoomMemberResponseDto로 변환하는 메서드
   */
  private mapToChatRoomMemberResponse(member: ChatRoomMember): ChatRoomMemberResponseDto {
    return {
      id: member.id,
      userId: member.userId,
      user: member.user
        ? {
            id: member.user.id,
            userName: member.user.userName,
            photoUrl: member.user.photoUrl,
          }
        : {
            id: '',
            userName: '',
            photoUrl: undefined,
          },
      role: member.role,
      unreadCount: member.unreadCount,
      createdAt: member.createdAt,
    };
  }
}
