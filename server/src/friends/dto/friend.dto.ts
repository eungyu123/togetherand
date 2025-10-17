import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { User } from 'src/users/entities/user.entity';
import { FriendRequestStatus } from '../enums/friend-request-status.enum';
/**
 * - recipientId: 친구 요청할 사용자 ID
 */
export class CreateFriendRequestDto {
  @ApiProperty({ description: '친구 요청할 사용자 ID' })
  @IsString()
  recipientId: string;
}

/**
 * - status: 친구 요청 상태
 */
export class UpdateFriendRequestDto {
  @ApiProperty({
    description: '친구 요청 상태',
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    example: 'pending',
  })
  @IsEnum(FriendRequestStatus)
  status: FriendRequestStatus;
}

/**
 * - id: 친구 요청 ID
 * - requesterId: 요청한 사용자 ID
 * - recipientId: 요청받은 사용자 ID
 * - status: 친구 요청 상태
 * - createdAt: 생성일
 * - updatedAt: 수정일
 */
export class FriendRequestResponseDto {
  @ApiProperty({ description: '친구 요청 ID' })
  id: string;

  @ApiProperty({ description: '요청한 사용자 ID' })
  requesterId: string;

  @ApiProperty({ description: '요청받은 사용자 ID' })
  recipientId: string;

  @ApiProperty({ description: '요청한 사용자 정보 - 조인 테이블 정보', type: () => User })
  requester: User;

  @ApiProperty({
    description: '친구 요청 상태',
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    example: 'pending',
  })
  status: FriendRequestStatus;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;
}

/**
 * - requests: 친구 요청 목록
 * - totalCount: 친구 요청 개수
 */
export class GetFriendRequestsResponseDto {
  @ApiProperty({ description: '친구 요청 목록', type: [FriendRequestResponseDto] })
  @IsArray()
  requests: FriendRequestResponseDto[];

  @ApiProperty({ description: '친구 요청 개수' })
  totalCount: number;
}

/**
 * - id: 친구 관계 ID
 * - userId: 사용자 ID
 * - friendId: 친구 ID
 * - friend: 친구 정보
 * - createdAt: 친구 관계 생성일
 */
export class FriendResponseDto {
  @ApiProperty({ description: '친구 ID' })
  id: string;

  @ApiProperty({ description: '친구 이름' })
  userName: string;

  @ApiProperty({ description: '친구 프로필 사진 URL', required: false })
  photoUrl?: string;

  @ApiProperty({ description: '상세 상태 (online, idle, away, offline)', required: false })
  status?: string;

  @ApiProperty({ description: '마지막 활동 시간', required: false })
  lastSeen?: string;
}

/**
 * - friends: 친구 목록
 * - totalCount: 친구 총 개수
 */
export class GetFriendsResponseDto {
  @ApiProperty({ description: '친구 목록', type: [FriendResponseDto] })
  @IsArray()
  friends: FriendResponseDto[];

  @ApiProperty({ description: '친구 총 개수' })
  totalCount: number;
}

/**
 * - userName: 검색할 사용자명
 */
export class SearchFriendsDto {
  @ApiProperty({ description: '검색할 사용자명', required: false })
  @IsOptional()
  @IsString()
  userName?: string;
}

/**
 * 검색된 사용자 정보 (친구 요청 상태 포함)
 * - id: 사용자 ID
 * - userName: 사용자명
 * - photoUrl: 프로필 사진 URL
 * - friendRequestStatus: 친구 요청 상태 (없으면 null)
 */
export class SearchedUserDto {
  @ApiProperty({ description: '사용자 ID' })
  id: string;

  @ApiProperty({ description: '사용자명' })
  userName: string;

  @ApiProperty({ description: '프로필 사진 URL', required: false })
  photoUrl?: string;

  @ApiProperty({
    description: '친구 요청 상태',
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    required: false,
    nullable: true,
    example: 'pending',
  })
  sentFriendRequest?: FriendRequestStatus | null;

  @ApiProperty({
    description: '보낸 친구 요청 ID',
    required: false,
    nullable: true,
    example: 'uuid-string',
  })
  sentFriendRequestId?: string | null;

  @ApiProperty({
    description: '친구 요청 상태',
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    required: false,
    nullable: true,
    example: 'pending',
  })
  receivedFriendRequest?: FriendRequestStatus | null;

  @ApiProperty({
    description: '받은 친구 요청 ID',
    required: false,
    nullable: true,
    example: 'uuid-string',
  })
  receivedFriendRequestId?: string | null;
}

/**
 * 사용자 검색 결과
 * - users: 검색된 사용자 목록
 * - totalCount: 검색된 사용자 총 개수
 */
export class SearchUsersResponseDto {
  @ApiProperty({ description: '검색된 사용자 목록', type: [SearchedUserDto] })
  users: SearchedUserDto[];

  @ApiProperty({ description: '검색된 사용자 총 개수' })
  totalCount: number;
}
