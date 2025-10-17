// lib/api/client/friends.ts

import {
  FriendRequestStatus,
  CreateFriendRequestDto,
  UpdateFriendRequestDto,
  FriendRequestResponseDto,
  GetFriendRequestsResponseDto,
  GetFriendsResponseDto,
  SearchFriendsDto,
  SearchedUserDto,
} from '@/domain/friend/api/friends.type';
import { ApiResponse } from '@/shared/api/types/common';
import { fetchWithAuth } from '@/shared/api/client/common';

// Friends API (클라이언트용)
export const friendsApi = {
  /**
   * ✅ 친구 요청 보내기
   */
  createFriendRequest: async (
    data: CreateFriendRequestDto
  ): Promise<ApiResponse<FriendRequestResponseDto | null>> => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friends/requests`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return response.json();
    } catch (error) {
      console.error('친구 요청 보내기 실패:', error);
      return {
        success: false,
        message: '친구 요청을 보내는데 실패했습니다.',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * 친구 요청 수락/거절/취소
   */
  updateFriendRequest: async (
    requestId: string,
    data: UpdateFriendRequestDto
  ): Promise<ApiResponse<FriendRequestResponseDto | null>> => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friends/requests/${requestId}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      );
      return response.json();
    } catch (error) {
      console.error('친구 요청 수락/거절/취소 실패:', error);
      return {
        success: false,
        message: '친구 요청을 수락/거절/취소하는데 실패했습니다.',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * 친구 요청 삭제
   */
  deleteFriendRequest: async (recipientId: string): Promise<ApiResponse<null>> => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friends/requests/${recipientId}`,
        {
          method: 'DELETE',
        }
      );
      return response.json();
    } catch (error) {
      console.error('친구 요청 삭제 실패:', error);
      return {
        success: false,
        message: '친구 요청을 삭제하는데 실패했습니다.',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * 친구 요청 목록 조회
   */
  getFriendRequests: async (
    type: string,
    status: FriendRequestStatus
  ): Promise<ApiResponse<GetFriendRequestsResponseDto | null>> => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('type', type);
      searchParams.set('status', status.toString());
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friends/requests?${searchParams.toString()}`
      );
      return response.json();
    } catch (error) {
      console.error('친구 요청 목록 조회 실패:', error);
      return {
        success: false,
        message: '친구 요청 목록을 불러오는데 실패했습니다.',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * 친구 목록 조회
   */
  getFriends: async (): Promise<ApiResponse<GetFriendsResponseDto | null>> => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/friends`);
      return response.json();
    } catch (error) {
      console.error('친구 목록 조회 실패:', error);
      return {
        success: false,
        message: '친구 목록을 불러오는데 실패했습니다.',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * 친구 삭제
   */
  deleteFriend: async (friendId: string): Promise<ApiResponse<null>> => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friends/${friendId}`,
        {
          method: 'DELETE',
        }
      );
      return response.json();
    } catch (error) {
      console.error('친구 삭제 실패:', error);
      return {
        success: false,
        message: '친구를 삭제하는데 실패했습니다.',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * ✅ 사용자 검색 (친구 추가용)
   */
  searchUsers: async (params: SearchFriendsDto): Promise<ApiResponse<SearchedUserDto[] | null>> => {
    try {
      const searchParams = new URLSearchParams();
      if (params.userName) {
        searchParams.set('userName', params.userName);
      }

      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friends/search?${searchParams.toString()}`,
        {
          method: 'GET',
        }
      );
      return response.json();
    } catch (error) {
      console.error('사용자 검색 실패:', error);
      return {
        success: false,
        message: '사용자를 검색하는데 실패했습니다.',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export default friendsApi;
