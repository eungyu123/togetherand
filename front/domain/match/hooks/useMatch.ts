import { useSocket } from '@/shared/components/providers/SocketProvider';
import { useCallback, useEffect } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { useCallStore } from '@/domain/call/store/call';
import { useChatStore } from '@/domain/chat/store/chat';
import { Message } from '@/domain/chat/api/chat.type';
import { getOrCreateDeviceId } from '@/shared/utils/utils';
import { isLocalStreamValid } from '@/shared/utils/utils';
import { useCallControls } from '@/domain/mediasoup/hooks/useCallControls';
const deviceId = getOrCreateDeviceId();

export const useMatch = () => {
  const { setCallState, setupLocalStream } = useCallStore.getState();

  const user = useAuthStore(state => state.user);
  const { mediasoupEnd } = useCallControls();
  const { matchSocket } = useSocket();

  const { addMessage, setTypingUser } = useChatStore.getState();
  // 매칭된 상태에서만 사용할 수 있는 기능들

  // 이벤트 리스너
  useEffect(() => {
    if (!matchSocket) return;

    // @ 상대방 메시지 수신
    matchSocket!.on('match:receive_message', (data: Message) => {
      addMessage(data.roomId, data);
    });

    // @ 상대방 타이핑 시작
    matchSocket!.on('match:opponent_typing_start', (data: { senderId: string; roomId: string }) => {
      const { senderId } = data;
      console.log('🔍 상대방 타이핑 시작', data);
      setTypingUser(data.roomId, senderId, true);
    });

    // @ 상대방 타이핑 중지
    matchSocket!.on('match:opponent_typing_stop', (data: { senderId: string; roomId: string }) => {
      const { senderId } = data;
      console.log('🔍 상대방 타이핑 중지', data);
      setTypingUser(data.roomId, senderId, false);
    });

    // @ 상대방 퇴장
    matchSocket!.on('match:match_end', (data: { roomId: string }) => {
      console.log('🔍 매칭 종료', data);
    });

    return () => {
      matchSocket!.off('match:receive_message');
      matchSocket!.off('match:opponent_typing_start');
      matchSocket!.off('match:opponent_typing_stop');
    };
  }, [matchSocket]);

  // // 타이핑 시작
  // const startTyping = useCallback(() => {
  //   const { roomId } = useCallStore.getState();
  //   if (!roomId || !matchSocket) return;

  //   matchSocket.getSocket?.emit('match:typing_start', { roomId });
  // }, [matchSocket]);

  // // 타이핑 종료
  // const stopTyping = useCallback(() => {
  //   const { roomId } = useCallStore.getState();
  //   if (!roomId || !matchSocket) return;

  //   matchSocket.getSocket?.emit('match:typing_stop', { roomId });
  // }, [matchSocket]);

  // 메시지 전송
  const handleSendMessage = (newMessage: string) => {
    const { roomId } = useCallStore.getState();
    if (!roomId || !matchSocket) return;

    if (roomId) {
      matchSocket.getSocket?.emit('match:send_message', {
        message: newMessage,
        roomId,
      });
    } else {
      // 혼자 채팅할 때
      if (!addMessage) return;

      const tempId = `${Date.now()}_${Math.random()}`;

      const message: Message = {
        id: tempId,
        roomId: 'solo_chat_room',
        senderId: user?.id || deviceId,
        senderName: user?.userName || 'Unknown',
        content: newMessage,
        createdAt: new Date().toISOString(),
        type: 'text',
      };
      addMessage('solo_chat_room', message);
    }
  };

  /**
   * 매칭 대기 등록
   */
  const createMatchRequest = async (gameType: string) => {
    const { callState } = useCallStore.getState();
    if (!matchSocket || callState === 'inCall' || callState === 'inMatch') return;

    try {
      await setupLocalStream();
      const response = await matchSocket.request('match:create_match_request', { gameType });
      if (!response.success) {
        throw new Error(response.message);
      }
      setCallState({ callState: 'inMatchWait' });
      console.log('🔍 매칭 시작 성공');
    } catch (error) {
      console.error('❌ 매칭 대기 등록 실패:', error);
      throw error;
    }
  };

  /**
   * 매칭 대기 취소
   */
  const cancelMatchRequest = async (gameType: string) => {
    if (!matchSocket) return;

    try {
      const response = await matchSocket.request('match:cancel_match_request', {
        gameType,
        deviceId: deviceId,
      });

      // prettier-ignore
      setCallState({ callState: 'ended', roomId: undefined, callerId: undefined, callerName: undefined, callStartTime: undefined, });
      if (!response.success) {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('❌ 매칭 대기 취소 실패:', error);
      throw error;
    }
  };

  return {
    handleSendMessage,
    createMatchRequest,
    cancelMatchRequest,
  };
};
