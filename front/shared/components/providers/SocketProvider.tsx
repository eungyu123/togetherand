'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { MediasoupSocket } from '@/domain/mediasoup/socket/mediasoupSocket';
import { ChatSocket } from '@/domain/chat/socket/chatSocket';
import { getOrCreateDeviceId } from '@/shared/utils/utils';
import { useAuthStore } from '@/shared/stores/auth';
import { logger } from '@/shared/utils/logger';
import { MatchSocket } from '@/domain/match/socket/matchSocket';

interface SocketContextType {
  mediasoupSocket: MediasoupSocket | null;
  chatSocket: ChatSocket | null;
  matchSocket: MatchSocket | null;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  // console.log('🔍 SocketProvider 렌더링');

  const user = useAuthStore(state => state.user);
  const [mediasoupSocket, setMediasoupSocket] = useState<MediasoupSocket | null>(null);
  const [chatSocket, setChatSocket] = useState<ChatSocket | null>(null);
  const [matchSocket, setMatchSocket] = useState<MatchSocket | null>(null);

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const userId = user?.id;
        const localDeviceId = getOrCreateDeviceId();
        // 미디어소스 소켓
        const mediasoupSocket = new MediasoupSocket(userId, localDeviceId);
        await mediasoupSocket.connect();
        setMediasoupSocket(mediasoupSocket);
        logger.info('✅ MediasoupSocket 연결 완료');

        // 매칭 소켓
        const matchSocket = new MatchSocket(userId, localDeviceId);
        await matchSocket.connect();
        setMatchSocket(matchSocket);
        logger.info('✅ MatchSocket 연결 완료');

        // 채팅 소켓
        if (userId) {
          const chatSocket = new ChatSocket(userId);
          await chatSocket.connect();
          setChatSocket(chatSocket);
          logger.info('✅ ChatSocket 연결 완료');
        }
      } catch (error) {
        logger.error('❌ 소켓 초기화 실패: ' + error);
      }
    };

    initializeSocket();

    return () => {
      mediasoupSocket?.disconnect();
      chatSocket?.disconnect();
    };
  }, [user?.id]);

  const value = {
    mediasoupSocket: mediasoupSocket,
    chatSocket: chatSocket,
    matchSocket: matchSocket,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
