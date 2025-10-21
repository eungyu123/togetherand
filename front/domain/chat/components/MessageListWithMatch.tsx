import { Message } from '@/domain/chat/api/chat.type';
import { useEffect } from 'react';
import { useRef } from 'react';
import { useChatStore } from '../store/chat';
import { useAuthStore } from '@/shared/stores/auth';
import { getOrCreateDeviceId } from '@/shared/utils/utils';

export function MessageListWithMatch({ roomId }: { roomId?: string }) {
  const user = useAuthStore(state => state.user);
  const deviceId = getOrCreateDeviceId();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isOpponentTyping = useChatStore(state => state.getTypingUsers(roomId || '')?.length > 0);
  const messages = useChatStore(state => state.messages[roomId || 'solo_chat_room']) || [];

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages?.length, isOpponentTyping]);

  useEffect(() => {
    const { markAsRead } = useChatStore.getState();
    markAsRead(roomId || '');
  }, [messages?.length, roomId]);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3" ref={messagesEndRef}>
      {messages.map((message: Message) => (
        <div
          key={message.id}
          className={`flex ${
            message.senderId === user?.id || message.senderId === deviceId
              ? 'justify-end'
              : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[80%] px-3 py-2 rounded-lg break-words overflow-wrap-anywhere ${
              message.senderId === user?.id || message.senderId === deviceId
                ? 'bg-neutral-600 text-white'
                : 'bg-gray-700 text-gray-200'
            }`}
          >
            <p className="text-sm break-words overflow-wrap-anywhere whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        </div>
      ))}

      {/* 상대방 타이핑 인디케이터 */}
      {isOpponentTyping && (
        <div className="flex items-center justify-start px-3 py-2">
          <div className="flex space-x-1">
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            ></div>
          </div>
        </div>
      )}

      {/* 스크롤 타겟용 빈 div */}
      <div ref={messagesEndRef} />
    </div>
  );
}
