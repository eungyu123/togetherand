import { MessageInput } from '@/domain/chat/components/MessageInput';
import { useEffect, useState } from 'react';
import { useSocket } from '@/shared/components/providers/SocketProvider';

interface MessageInputProps {
  roomId: string;
  onSendMessage: (messageInput: string) => void;
}

export function MessageInputComponent({ roomId, onSendMessage }: MessageInputProps) {
  // 타이핑 상태 관리
  const [messageInput, setMessageInput] = useState('');
  const { chatSocket } = useSocket();

  useEffect(() => {
    if (messageInput.trim()) {
      chatSocket?.getSocket?.emit('typing-start', { roomId });
    } else {
      chatSocket?.getSocket?.emit('typing-stop', { roomId });
    }
  }, [messageInput, chatSocket, roomId]);

  return (
    <MessageInput
      messageInput={messageInput}
      setMessageInput={setMessageInput}
      onSendMessage={() => {
        onSendMessage(messageInput);
        setMessageInput('');
      }}
    />
  );
}
