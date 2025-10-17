import { useEffect } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { useChatStore } from '@/domain/chat/store/chat';
import { useSocket } from '@/shared/components/providers/SocketProvider';
import { Message } from '@/domain/chat/api/chat.type';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';

/**
 * 채팅 소켓 이벤트 리스너를 관리하는 훅
 */
export function useChatSocketEvents() {
  const user = useAuthStore(state => state.user);
  const pathname = usePathname();
  const { addMessage, setTypingUser } = useChatStore();
  const { chatSocket } = useSocket();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!user?.id || !chatSocket) return;

    // 메시지 수신
    chatSocket.on('message-received', (message: Message) => {
      const newMessage = message;
      addMessage(message.roomId, newMessage);
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    });

    // 타이핑 상태
    // prettier-ignore
    chatSocket.on('user-typing', (data: { userId: string, roomId: string, userName: string, isTyping: boolean }) => {
      if (data.userId !== user.id) {
        setTypingUser(data.roomId, data.userName, data.isTyping);
      }
    });

    return () => {
      chatSocket.off('message-received');
      chatSocket.off('user-typing');
    };
  }, [user?.id, chatSocket, addMessage, setTypingUser, queryClient, pathname]);
}
