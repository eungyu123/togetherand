import { useMatchContext } from '@/domain/match/components/MatchProvider';
import { useSocket } from '@/shared/components/providers/SocketProvider';
import { Send } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useChatRoom } from '../hooks/useChatRoom';

export function MessageInput({
  roomId,
  socketType,
}: {
  roomId?: string;
  socketType: 'match' | 'chat';
}) {
  const { chatSocket, matchSocket } = useSocket();
  const { handleSendMessage: handleSendMatchMessage } = useMatchContext();
  const { handleSendMessage: handleSendChatMessage } = useChatRoom(roomId || '');

  const [messageInput, setMessageInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  const onSendMessage = () => {
    if (socketType === 'match') {
      handleSendMatchMessage(messageInput);
    } else if (socketType === 'chat') {
      handleSendChatMessage(messageInput);
    }
    setMessageInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault();
      e.stopPropagation();
      onSendMessage();
    }
  };

  useEffect(() => {
    if (socketType === 'chat') {
      if (messageInput.trim()) {
        chatSocket?.getSocket?.emit('typing-start', { roomId });
      } else {
        chatSocket?.getSocket?.emit('typing-stop', { roomId });
      }
    } else if (socketType === 'match') {
      if (messageInput.trim()) {
        matchSocket?.getSocket?.emit('match:typing_start', { roomId });
      } else {
        matchSocket?.getSocket?.emit('match:typing_stop', { roomId });
      }
    }
  }, [messageInput, chatSocket, roomId]);

  return (
    <div className="py-2 px-4 h-fit bg-main-black-800 border-t border-main-black-700 lg:rounded-b-xl">
      <div className="flex gap-3 items-center">
        <input
          ref={inputRef}
          type="text"
          value={messageInput}
          onChange={e => setMessageInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="메시지 보내기"
          className="w-full px-3 h-10 bg-main-black-700 border border-main-black-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-neutral-500"
        />

        <button
          onClick={onSendMessage}
          disabled={!messageInput.trim()}
          className={` p-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center ${
            !messageInput.trim()
              ? 'bg-main-black-600 text-neutral-400 cursor-not-allowed'
              : 'bg-neutral-600 hover:bg-neutral-700 text-white'
          }`}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
