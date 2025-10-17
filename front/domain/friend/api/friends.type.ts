// lib/api/types/friends.ts

import { UserType } from '@/shared/api/types/user';

/**
 * 친구 요청 상태
 * - pending: 대기 중
 * - accepted: 수락됨
 * - rejected: 거절됨
 * - cancelled: 취소됨
 */
export enum FriendRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

/**
 * 친구 요청 생성 요청 데이터
 * - recipientId: 친구 요청 받는 사용자 ID
 */
export interface CreateFriendRequestDto {
  recipientId: string;
}

/**
 * 친구 요청 상태 업데이트 요청 데이터
 * - status: 친구 요청 상태
 */
export interface UpdateFriendRequestDto {
  status: FriendRequestStatus;
}

/**
 * 친구 요청 응답 데이터
 * - id: 친구 요청 ID
 * - requesterId: 친구 요청 보낸 사용자 ID
 * - recipientId: 친구 요청 받는 사용자 ID
 * - status: 친구 요청 상태
 * - createdAt: 친구 요청 생성 시간
 * - updatedAt: 친구 요청 수정 시간
 */
export interface FriendRequestResponseDto {
  id: string;
  requesterId: string;
  recipientId: string;
  status: FriendRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 친구 요청 목록 응답 데이터
 * - receivedRequests: 받은 친구 요청 목록
 * - sentRequests: 보낸 친구 요청 목록
 * - totalSentCount: 보낸 친구 요청 총 개수
 * - totalReceivedCount: 받은 친구 요청 총 개수
 */
export interface GetFriendRequestsResponseDto {
  requests: {
    id: string;
    requesterId: string;
    recipientId: string;
    status: FriendRequestStatus;
    createdAt: Date;
    updatedAt: Date;
    requester?: UserType;
    recipient?: UserType;
  }[];
  totalCount: number;
}

export interface Friend {
  id: string;
  userName: string;
  photoUrl: string | null;
  status: string;
  lastSeen: string;
}

/**
 * 친구 목록 응답 데이터
 * - friends: 친구 목록
 * - totalCount: 친구 총 개수
 */
export interface GetFriendsResponseDto {
  friends: Friend[];
  totalCount: number;
}

/**
 * 친구 검색 요청 데이터
 * - userName: 사용자 이름
 */
export interface SearchFriendsDto {
  userName?: string;
}

/**
 * 검색된 사용자 응답 데이터
 * - id: 사용자 ID
 * - userName: 사용자명
 * - photoUrl: 프로필 사진 URL (선택사항)
 * - sentFriendRequest: 보낸 친구 요청 상태 (선택사항)
 * - sentFriendRequestId: 보낸 친구 요청 ID (선택사항)
 * - receivedFriendRequest: 받은 친구 요청 상태 (선택사항)
 * - receivedFriendRequestId: 받은 친구 요청 ID (선택사항)
 */
export interface SearchedUserDto {
  id: string;
  userName: string;
  photoUrl?: string;
  sentFriendRequest?: FriendRequestStatus;
  sentFriendRequestId?: string;
  receivedFriendRequest?: FriendRequestStatus;
  receivedFriendRequestId?: string;
}
