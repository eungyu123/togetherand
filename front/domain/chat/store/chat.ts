import { create } from 'zustand';
import { Message } from '@/domain/chat/api/chat.type';
import { useAuthStore } from '@/shared/stores/auth';
import { getOrCreateDeviceId } from '@/shared/utils/utils';

interface ChatState {
  messages: Record<string, Message[]>; // roomId -> messages
  typingUsers: Record<string, string[]>; // roomId -> typing user names
  unreadMessages: Record<string, number>; // roomId -> unread count
  addMessage: (roomId: string, message: Message) => void;
  addMessages: (roomId: string, messages: Message[]) => void;
  setTypingUser: (roomId: string, userName: string, isTyping: boolean) => void;
  getTypingUsers: (roomId: string) => string[];
  clearMessages: (roomId: string) => void;
  markAsRead: (roomId: string) => void; // 메시지를 읽음으로 표시
  getUnreadCount: (roomId: string) => number; // 읽지 않은 메시지 수
  getAllUnreadCount: () => number; // 모든 읽지 않은 메시지 수
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  typingUsers: {},
  unreadMessages: {},

  // 메시지
  addMessage: (roomId: string, message: Message) => {
    set(state => {
      const existingMessages = state.messages[roomId] || [];
      // 이미 존재하는 메시지인지 확인
      if (existingMessages.some(msg => msg.id === message.id)) {
        return state; // 중복된 메시지는 추가하지 않음
      }

      let userId = useAuthStore.getState().user?.id;
      if (!userId) userId = getOrCreateDeviceId();
      const isFromOpponent = message.senderId !== userId;

      return {
        messages: {
          ...state.messages,
          [roomId]: [...existingMessages, message], // 새 배열 생성
        },
        unreadMessages: isFromOpponent
          ? {
              ...state.unreadMessages,
              [roomId]: (state.unreadMessages[roomId] || 0) + 1,
            }
          : state.unreadMessages,
      };
    });
  },

  // 초기 로딩, 위로 스크롤시 한번에 여러개 로딩
  addMessages: (roomId: string, newMessages: Message[]) => {
    set(state => {
      const existingMessages = state.messages[roomId] || [];
      const existingIds = new Set(existingMessages.map(msg => msg.id));

      // 중복되지 않는 메시지만 추가
      const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));

      // 모든 메시지를 합치고 시간순으로 정렬
      const allMessages = [...existingMessages, ...uniqueNewMessages]; // 새 배열 생성
      const sortedMessages = allMessages.sort((a, b) => {
        return a.createdAt.localeCompare(b.createdAt);
      });

      return {
        messages: {
          ...state.messages,
          [roomId]: sortedMessages,
        },
      };
    });
  },

  // 타이핑 상태
  setTypingUser: (roomId: string, userName: string, isTyping: boolean) => {
    set(state => {
      const currentTyping = state.typingUsers[roomId] || [];

      if (isTyping) {
        // 타이핑 시작
        if (!currentTyping.includes(userName)) {
          return {
            typingUsers: {
              ...state.typingUsers,
              [roomId]: [...currentTyping, userName],
            },
          };
        }
      } else {
        // 타이핑 종료
        return {
          typingUsers: {
            ...state.typingUsers,
            [roomId]: currentTyping.filter(name => name !== userName),
          },
        };
      }

      return state;
    });
  },

  // 타이핑 상태 가져오기
  getTypingUsers: (roomId: string) => {
    return get().typingUsers[roomId] || [];
  },

  // 메시지 삭제
  clearMessages: (roomId: string) => {
    set(state => {
      const newMessages = { ...state.messages };
      const newUnreadMessages = { ...state.unreadMessages };
      delete newMessages[roomId];
      delete newUnreadMessages[roomId];

      return {
        messages: newMessages,
        unreadMessages: newUnreadMessages,
      };
    });
  },

  // 메시지를 읽음으로 표시
  markAsRead: (roomId: string) => {
    set(state => {
      const newUnreadMessages = { ...state.unreadMessages };
      delete newUnreadMessages[roomId];

      return {
        unreadMessages: newUnreadMessages,
      };
    });
  },

  // 읽지 않은 메시지 수 가져오기
  getUnreadCount: (roomId: string) => {
    return get().unreadMessages[roomId] || 0;
  },

  // 모든 읽지 않은 메시지 수 가져오기
  getAllUnreadCount: () => {
    return Object.values(get().unreadMessages).reduce((acc, count) => acc + count, 0);
  },
}));
