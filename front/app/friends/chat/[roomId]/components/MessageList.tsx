import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Message } from '@/domain/chat/api/chat.type';
import { getKoreanTimeFormatted } from '@/shared/utils/date.utils';
import { useChatStore } from '@/domain/chat/store/chat';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/shared/components/providers/SocketProvider';

interface MessageListProps {
  messages: Message[] | undefined;
  isTyping: boolean;
  roomId: string;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMoreMessages?: boolean;
  isInitialLoading?: boolean;
}

export function MessageList({
  messages,
  isTyping,
  roomId,
  onLoadMore,
  isLoadingMore = false,
  hasMoreMessages = true,
  isInitialLoading = false,
}: MessageListProps) {
  const { chatSocket } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingIndicatorRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const previousScrollHeight = useRef<number>(0);
  const shouldMaintainScrollPosition = useRef<boolean>(false);

  const scrollToBottom = () => {
    const container = messagesEndRef.current?.parentElement?.parentElement;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  // 스크롤 이벤트 핸들러
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;

    // 맨 위에 가까이 왔을 때 이전 메시지 로드
    if (scrollTop < 100 && hasMoreMessages && !isLoadingMore && onLoadMore) {
      // 스크롤 위치 유지를 위해 현재 스크롤 높이 저장
      previousScrollHeight.current = container.scrollHeight;
      shouldMaintainScrollPosition.current = true;
      onLoadMore();
    }
  };

  // 스크롤 위치 유지
  useEffect(() => {
    if (shouldMaintainScrollPosition.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const newScrollHeight = container.scrollHeight;
      const heightDifference = newScrollHeight - previousScrollHeight.current;

      if (heightDifference > 0) {
        container.scrollTop = heightDifference;
      }

      shouldMaintainScrollPosition.current = false;
    } else {
      scrollToBottom();
    }
  }, [messages?.length, isTyping]);

  useEffect(() => {
    const { markAsRead } = useChatStore.getState();
    const markAsReadSocket = async () => {
      try {
        const res = await chatSocket?.request('mark-messages-read', { roomId });
        if (res?.success) {
          queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
        }
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
      }
    };

    markAsRead(roomId); // 로컬 상태 업데이트
    markAsReadSocket(); // 서버 상태 업데이트
  }, [messages?.length, roomId, chatSocket, queryClient]);

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 bg-main-black-900 overflow-y-auto px-4 pt-4"
      onScroll={handleScroll}
    >
      {/* 이전 메시지 로딩 인디케이터 */}
      {(isLoadingMore || isInitialLoading) && (
        <div className="flex justify-center py-4">
          <div className="text-sm text-gray-400">이전 메시지를 불러오는 중...</div>
        </div>
      )}

      <div className="space-y-4">
        {messages?.map(message => (
          <div key={message.id} className="flex justify-start">
            <div className="max-w-[280px] lg:max-w-md">
              <div className="flex items-center gap-2 mb-1">
                {message.photoUrl && (
                  <Image
                    src={message.photoUrl}
                    alt={message.senderName}
                    className="w-6 h-6 object-cover rounded-xs"
                    width={24}
                    height={24}
                  />
                )}
                <span className="text-sm font-medium text-white">{message.senderName}</span>
                <span className="text-xs text-neutral-400">
                  {getKoreanTimeFormatted(new Date(message.createdAt), 'minute')}
                </span>
              </div>

              {/* 일반 텍스트 메시지 */}
              {(!message.type || message.type === 'text') && (
                <div className="p-3 rounded-lg bg-main-black-700 text-neutral-200">
                  <p className="text-sm break-words overflow-wrap-anywhere whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 상대방 타이핑 인디케이터 */}
        {isTyping && (
          <div ref={typingIndicatorRef} className=" text-sm text-neutral-400">
            상대방이 입력 중입니다...
          </div>
        )}

        {/* 스크롤 타겟용 빈 div */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
