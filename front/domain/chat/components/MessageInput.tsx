import { Send } from 'lucide-react';
import React, { useRef, useState } from 'react';

interface MessageInputProps {
  messageInput: string;
  setMessageInput: (value: string) => void;
  onSendMessage: () => void;
}

export function MessageInput({ messageInput, setMessageInput, onSendMessage }: MessageInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault();
      e.stopPropagation();
      onSendMessage();
    }
  };

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
