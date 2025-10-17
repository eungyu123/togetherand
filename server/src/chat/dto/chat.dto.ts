import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsUUID, IsUrl } from 'class-validator';
import { ChatRoomType } from '../entities/chat-room.entity';
import { MessageType } from '../entities/chat-message.entity';
import { MemberRole } from '../entities/chat-room-member.entity';

// 채팅방 생성 DTO
export class CreateChatRoomDto {
  @ApiProperty({ description: '채팅방 이름' })
  @IsString()
  name: string;

  @ApiProperty({
    description: '채팅방 타입',
    enum: ['direct', 'group', 'channel'],
    example: 'direct',
  })
  @IsEnum(ChatRoomType)
  type: ChatRoomType;

  @ApiProperty({ description: '채팅방 이미지 URL', required: false })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({ description: '멤버 ID 목록', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  memberIds?: string[];
}

// 메시지 전송 DTO
export class SendMessageDto {
  @ApiProperty({ description: '채팅방 ID' })
  @IsUUID('4')
  roomId: string;

  @ApiProperty({ description: '메시지 내용' })
  @IsString()
  content: string;

  @ApiProperty({
    description: '메시지 타입',
    enum: ['text', 'image', 'file', 'system'],
    example: 'text',
  })
  @IsEnum(MessageType)
  type: MessageType = MessageType.TEXT;
}

// 채팅방 멤버 추가 DTO
export class AddMemberDto {
  @ApiProperty({ description: '추가할 사용자 ID' })
  @IsUUID('4')
  userId: string;

  @ApiProperty({
    description: '멤버 역할',
    enum: ['owner', 'admin', 'member'],
    example: 'member',
  })
  @IsEnum(MemberRole)
  role: MemberRole = MemberRole.MEMBER;
}

// 채팅방 수정 DTO
export class UpdateChatRoomDto {
  @ApiProperty({ description: '채팅방 이름', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '채팅방 이미지 URL', required: false })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}

// 채팅방 멤버 삭제 DTO
export class RemoveMemberDto {
  @ApiProperty({ description: '삭제할 사용자 ID' })
  @IsUUID('4')
  userId: string;
}

// 응답 DTO들
export class ChatRoomResponseDto {
  @ApiProperty({ description: '채팅방 ID' })
  id: string;

  @ApiProperty({ description: '채팅방 이름' })
  name: string;

  @ApiProperty({ description: '채팅방 타입' })
  type: ChatRoomType;

  @ApiProperty({ description: '채팅방 이미지 URL', required: false })
  imageUrl?: string;

  @ApiProperty({ description: '생성자 ID' })
  createdBy?: string;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;

  @ApiProperty({ description: '멤버 수' })
  memberCount: number;

  @ApiProperty({ description: '마지막 메시지' })
  lastMessage?: any;

  @ApiProperty({ description: '안읽은 메시지 수' })
  unreadCount: number;
}

export class ChatMessageResponseDto {
  @ApiProperty({ description: '메시지 ID' })
  id: string;

  @ApiProperty({ description: '채팅방 ID' })
  roomId: string;

  @ApiProperty({ description: '발신자 ID' })
  senderId: string;

  @ApiProperty({ description: '발신자 정보' })
  senderName: string;

  @ApiProperty({ description: '발신자 프로필 사진 URL', required: false })
  photoUrl?: string;

  @ApiProperty({ description: '메시지 타입' })
  type: MessageType;

  @ApiProperty({ description: '메시지 내용' })
  content: string;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;
}

export class ChatRoomMemberResponseDto {
  @ApiProperty({ description: '멤버 ID' })
  id: string;

  @ApiProperty({ description: '사용자 ID' })
  userId: string;

  @ApiProperty({ description: '사용자 정보' })
  user: {
    id: string;
    userName: string;
    photoUrl?: string;
  };

  @ApiProperty({ description: '멤버 역할' })
  role: MemberRole;

  @ApiProperty({ description: '안읽은 메시지 수' })
  unreadCount: number;

  @ApiProperty({ description: '가입일' })
  createdAt: Date;
}
