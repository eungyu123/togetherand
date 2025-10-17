import { ApiResponse } from '@/shared/api/types/common';
import { Message, CreateChatRoomResponse } from '@/domain/chat/api/chat.type';
import { fetchWithAuth } from '@/shared/api/client/common';

/**
 * 채팅 API 클라이언트
 */
export const chatApi = {
  /**
   * 채팅방 생성
   */
  createChatRoom: async (data: {
    name: string;
    type: 'direct' | 'group';
    memberIds: string[];
  }): Promise<CreateChatRoomResponse | null> => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/rooms`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
      return null;
    }
  },

  /**
   * 채팅방 정보 수정
   */
  updateChatRoom: async (roomId: string, data: { name?: string; imageUrl?: string }) => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/rooms/${roomId}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      );
      return response.json();
    } catch (error) {
      console.error('채팅방 정보 수정 실패:', error);
      return null;
    }
  },

  /**
   * 채팅방 목록 조회
   */
  getChatRooms: async () => {
    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/rooms`);
      return response.json();
    } catch (error) {
      console.error('채팅방 목록 조회 실패:', error);
      return {
        success: false,
        message: '채팅방 목록 조회에 실패했습니다.',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * 채팅방 멤버 목록 조회
   */
  getRoomMembers: async (roomId: string) => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/rooms/${roomId}/members`
      );
      return response.json();
    } catch (error) {
      console.error('채팅방 멤버 목록 조회 실패:', error);
      return {
        success: false,
        message: '채팅방 멤버 목록 조회에 실패했습니다.',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * 채팅방 메시지 목록 조회
   */
  getRoomMessages: async (
    roomId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<ApiResponse<Message[]>> => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/rooms/${roomId}/messages?page=${page}&limit=${limit}`
      );
      return response.json();
    } catch (error) {
      console.error('채팅방 메시지 목록 조회 실패:', error);
      return {
        success: false,
        message: '채팅방 메시지 목록 조회에 실패했습니다.',
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * 채팅방 멤버 추가
   */
  addMemberToRoom: async (roomId: string, userId: string, role: string = 'member') => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/rooms/${roomId}/members`,
        {
          method: 'POST',
          body: JSON.stringify({ userId, role }),
        }
      );
      return response.json();
    } catch (error) {
      console.error('채팅방 멤버 추가 실패:', error);
      return {
        success: false,
        message: '채팅방 멤버 추가에 실패했습니다.',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * 채팅방 나가기
   */
  leaveChatRoom: async (roomId: string) => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/rooms/${roomId}/leave`,
        {
          method: 'POST',
        }
      );
      return response.json();
    } catch (error) {
      console.error('채팅방 나가기 실패:', error);
      return {
        success: false,
        message: '채팅방 나가기에 실패했습니다.',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * 채팅방 삭제
   */
  deleteChatRoom: async (roomId: string) => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/rooms/${roomId}/delete`,
        {
          method: 'POST',
        }
      );
      return response.json();
    } catch (error) {
      console.error('채팅방 삭제 실패:', error);
      return {
        success: false,
        message: '채팅방 삭제에 실패했습니다.',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * 안읽은 메시지 조회
   */

  getRoomUnreadCount: async () => {
    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/unread-counts`
      );

      return response.json();
    } catch (error) {
      console.error('안읽은 메시지 조회 실패:', error);
      return {
        success: false,
        message: '안읽은 메시지 조회에 실패했습니다.',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }
  },
};
