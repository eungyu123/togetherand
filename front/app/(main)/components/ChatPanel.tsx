'use client';

import { useEffect, useRef, useState } from 'react';
import { Message } from '@/domain/chat/api/chat.type';
import { useAuthStore } from '@/shared/stores/auth';
import { getOrCreateDeviceId } from '@/shared/utils/utils';
import { MessageInput } from '@/domain/chat/components/MessageInput';
import { useChatStore } from '@/domain/chat/store/chat';
import { useCallStore } from '@/domain/call/store/call';
import { useMatchContext } from '@/domain/match/components/MatchProvider';

export default function ChatPanel() {
  const { startTyping, stopTyping, handleSendMessage } = useMatchContext();

  const user = useAuthStore(state => state.user);
  const deviceId = getOrCreateDeviceId();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const roomId = useCallStore(state => state.roomId);

  const isOpponentTyping = useChatStore(state => state.getTypingUsers(roomId || '')?.length > 0);
  const messages = useChatStore(state => state.messages[roomId || 'solo_chat_room']) || [];

  // 디바운스된 타이핑 함수들
  useEffect(() => {
    if (newMessage.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  }, [newMessage, startTyping, stopTyping]);

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
    <div className="flex flex-col lg:p-4 w-full lg:w-1/4  h-full bg-[#131314] lg:rounded-xl overflow-hidden">
      <div className="flex flex-col w-full h-full bg-[#1a191a] rounded-xl">
        {/* 메시지 목록 */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3"
          ref={messagesEndRef}
        >
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

        {/* 메시지 입력창 */}
        <MessageInput
          messageInput={newMessage}
          setMessageInput={setNewMessage}
          onSendMessage={() => {
            handleSendMessage(newMessage);
            setNewMessage('');
          }}
        />
      </div>
    </div>
  );
}
