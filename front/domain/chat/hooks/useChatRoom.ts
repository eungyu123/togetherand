'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { useChatStore } from '@/domain/chat/store/chat';
import { useChatActions } from '@/domain/chat/hooks/useChatActions';
import { useSocket } from '@/shared/components/providers/SocketProvider';
import { chatApi } from '@/domain/chat/api/chat';

export const useChatRoom = (roomId: string) => {
  const user = useAuthStore(state => state.user);
  const { addMessages } = useChatStore.getState();
  const { chatSocket } = useSocket();

  const messages = useChatStore(state => state.messages[roomId || '']) || [];
  const isTyping = useChatStore(state => state.getTypingUsers(roomId || '').length > 0);

  // 탄스택 쿼리 제거하고 직접 API 호출
  // const { useGetRoomMessages } = useChatActions();
  // const { data: initialMessages } = useGetRoomMessages(roomId, 1, 50);

  const [isConnected, setIsConnected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // 채팅방 구독
  useEffect(() => {
    const subscribeToRoom = async () => {
      try {
        if (!user?.id || !roomId || !chatSocket) return;
        await chatSocket.request('subscribe-room', { roomId });
        setIsConnected(true);
      } catch (error) {
        console.error('채팅방 구독 실패:', error);
      }
    };
    subscribeToRoom();

    return () => {
      setIsConnected(false);
    };
  }, [user?.id, roomId, chatSocket]);

  // Generator를 사용한 초기 메시지 로드
  useEffect(() => {
    const loadInitialMessages = async () => {
      if (!roomId) return;

      setIsInitialLoading(true);
      try {
        const messageStream = messageStreamGenerator(roomId, 1);
        const result = await messageStream.next();

        if (!result.done && result.value) {
          const { messages: initialMessages, hasMore } = result.value;
          addMessages(roomId, initialMessages);
          setHasMoreMessages(hasMore);
        } else {
          setHasMoreMessages(false);
        }
      } catch (error) {
        console.error('초기 메시지 로드 실패:', error);
        setHasMoreMessages(false);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadInitialMessages();
  }, [roomId, addMessages]);

  // 고급 Generator를 사용한 메시지 스트리밍
  async function* messageStreamGenerator(roomId: string, startPage: number = 1) {
    let page = startPage;
    let hasMore = true;
    let retryCount = 0;
    const maxRetries = 3;

    while (hasMore) {
      try {
        const response = await chatApi.getRoomMessages(roomId, page, 50);

        if (response.success && response.data.length > 0) {
          retryCount = 0;

          yield {
            messages: response.data,
            page,
            hasMore: response.data.length === 50,
            timestamp: Date.now(),
          };

          page++;
          hasMore = response.data.length === 50;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`페이지 ${page} 로드 실패:`, error);
        retryCount++;

        if (retryCount < maxRetries) {
          // 지수 백오프로 재시도
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          hasMore = false;
        }
      }
    }
  }

  // 이전 메시지 로드 (고급 Generator 사용)
  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;

      // 단일 페이지 로드
      const messageStream = messageStreamGenerator(roomId, nextPage);
      const result = await messageStream.next();

      if (!result.done && result.value) {
        const { messages: newMessages, page, hasMore } = result.value;

        addMessages(roomId, newMessages);
        setCurrentPage(page);
        setHasMoreMessages(hasMore);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('이전 메시지 로드 실패:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 메시지 전송
  const handleSendMessage = async (messageInput: string) => {
    try {
      if (!messageInput.trim() || !roomId || !isConnected || !user?.id || !chatSocket) {
        throw new Error('메시지가 비어있거나 채팅방이 없습니다.');
      }

      // 소켓으로 메시지 전송
      await chatSocket.request('send-message', {
        roomId,
        content: messageInput.trim(),
        type: 'text',
      });
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    }
  };

  return {
    messages,
    isTyping,
    handleSendMessage,
    loadMoreMessages,
    isLoadingMore,
    hasMoreMessages,
    isInitialLoading,
    // Generator 함수들도 노출 (고급 사용자용)
  };
};
