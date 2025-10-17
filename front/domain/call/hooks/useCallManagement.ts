import { useEffect } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { useCallStore } from '@/domain/call/store/call';
import { useSocket } from '@/shared/components/providers/SocketProvider';
import { logger } from '@/shared/utils/logger';
import { useRouter } from 'next/navigation';
import { getKoreanTime } from '@/shared/utils/date.utils';
import { toast } from 'react-hot-toast';

// prettier-ignore
export function useCallManagement() {
  // console.log('🔍 useCallManagement 렌더링');
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const { chatSocket } = useSocket();
  
  // 모든 상태를 getState로 직접 접근 (리렌더링 방지)
  const { addParticipant, removeParticipant, setCallState, setupLocalStream } = useCallStore.getState();

  // 채팅소켓 이벤트 리스너
  useEffect(() => {
    console.log('userid', user?.id);
    if (!user?.id || !chatSocket) return;
    
    // 이미 존재하는 전화 요청 확인
    chatSocket.request('call:check:pending');

    // @ 전화 수신
    chatSocket.on('call:incoming', (data: { callerId: string, callerName: string, roomId: string, callStartTime: string }) => {
      const { callerId, callerName, roomId,  } = data;
      logger.info('✅ 전화 수신', callerId, callerName, roomId, );
      setCallState({ callState: 'inComing', callerId, callerName, roomId, callStartTime: getKoreanTime(), });
    });

    // @ 수신자가 전화 수락 (발신자가 받음, 어떤 사용자가 수신했는지만 보여줌)
    chatSocket.on('call:accepted', (data: { roomId: string, acceptedBy: string }) => {
      const {  roomId, acceptedBy } = data;
      logger.info('✅ 전화 수락', roomId, acceptedBy);
      toast.success(`${acceptedBy}님이 전화를 수락했습니다`);
      // setCallState({ callState: 'inCall'}); 

      // 전화 수락되면 채팅방으로 이동 (Next.js가 자동으로 중복 방지)
      // router.push(`/friends/chat/${roomId}`); // 이동은 call:success 이벤트에서 처리
    });

    // @ 전화 거절됨
    chatSocket.on('call:rejected', (data: { rejectedBy: string, timestamp: string }) => {
      const { rejectedBy, timestamp } = data;
      logger.info('✅ 전화 거절', rejectedBy, timestamp);
    });

    // @ 전화 종료됨
    chatSocket.on('call:ended', (data: { roomId: string, callerId: string, callerName: string, callStartTime: string }) => {
      logger.info('✅ 전화 종료', data);
      setCallState({ callState: 'ended', roomId: undefined, callerId: undefined, callerName: undefined, callStartTime: undefined, });
      // 리소스 정리는 useCallStore에서 처리됨

      router.push(`/friends`);
    });

    // @ 새로운 유저 통화 입장 (중복 방지)
    chatSocket.on('call:user_joined', (data: { userId: string, userName: string, userPhotoUrl: string }) => {
      const { userId, userName, userPhotoUrl } = data;
      logger.info('✅ 새로운 유저 통화 입장', userId, userName, userPhotoUrl);
      const { participants } = useCallStore.getState();
      if (!participants.has(userId) && userId !== user.id) {
        addParticipant({ userId: userId, userName: userName, userPhotoUrl: userPhotoUrl, });
      }
    });

    // @ 기존 유저 통화 퇴장
    chatSocket.on('call:user_left', (data: { userId: string, userName: string }) => {
      const { userId, userName } = data;
      logger.info('✅ 상대방 퇴장', userId, userName);
      removeParticipant(userId);
    });

    // @ 전화 요청 타임아웃
    chatSocket.on('call:cancelled', (data: { callerId: string, callerName: string }) => {
      const { callerId, callerName } = data;
      logger.info('✅ 전화 요청 타임아웃', callerId, callerName);
      setCallState({ callState: 'ended',  callerId,  callerName, callStartTime: undefined, });
      // 리소스 정리는 useCallStore에서 처리됨

    });

    return () => {
      const { roomId, callState } = useCallStore.getState();
      if (roomId && chatSocket?.getSocket && callState === 'inCall') {
        chatSocket.getSocket.emit('call:end', { roomId });
        logger.info('✅ 컴포넌트 언마운트 시 통화 종료 신호 전송', roomId);
      }

      setCallState({ callState: 'ended', roomId: undefined, callerId: undefined, callerName: undefined, callStartTime: undefined, });
      // 리소스 정리는 useCallStore에서 처리됨

      chatSocket.off('call:incoming');
      chatSocket.off('call:accepted');
      chatSocket.off('call:rejected');
      chatSocket.off('call:ended');
      chatSocket.off('call:user_joined');
      chatSocket.off('call:user_left');
      chatSocket.off('call:cancelled');
    };
  }, [user?.id, chatSocket]);

  // 전화걸기
  const handleInitiateCall = async (roomId: string) => {
    if (!chatSocket || !user) return;

    try {
      await setupLocalStream();
      
      setCallState({ callState: 'outGoing', roomId: roomId });
      const response = await chatSocket.request('call:request', { roomId });

      if (!response.success) {
        setCallState({ callState: 'ended' });
        throw new Error(response.message);
      }

      logger.info('✅ 전화 요청 완료', response);
    } catch (error) {
      logger.error('❌ 전화 요청 중 오류:', error);
      setCallState({ callState: 'ended' });
    }
  };

  // 전화 수락
  const handleAcceptCall = async (roomId: string) => {
    const { callerId } = useCallStore.getState();
    if (!chatSocket || !callerId || !user) {
      console.error('❌ 통화 수락 실패: 필수 데이터 누락', { chatSocket: !!chatSocket, callerId, roomId, });
      return;
    }

    try {
      // 전화 수락
      const response1 = await chatSocket.request('call:response', { callerId: callerId, accepted: true, roomId: roomId, });
      if (!response1.success) throw new Error(response1.message);
      
      setCallState({ callState: 'inCall' });

      // 기존 참여자들을 조회
      const response2 = await chatSocket.request('call:check:existing', { roomId: roomId, });
      if (!response2.success) throw new Error(response2.message);

      logger.debug('✅ 기존 참여자들을 조회', response2);
      // 기존 참여자들을 추가 (중복 방지)
      if (response2.existingParticipants && Array.isArray(response2.existingParticipants)) {
        const { participants } = useCallStore.getState();
        response2.existingParticipants.forEach((participant: { userId: string, userName: string, userPhotoUrl: string }) => {
          if (!participants.has(participant.userId) && participant.userId !== user.id) {
            addParticipant({ userId: participant.userId, userName: participant.userName, userPhotoUrl: participant.userPhotoUrl, });
          }
        });
      }

      logger.info('✅ 전화 수락 완료');
      router.push(`/friends/chat/${roomId}`); // 전화 수락되면 채팅방으로 이동 (Next.js가 자동으로 중복 방지)
    } catch (error) {
      logger.error('❌ 전화 수락 중 오류:', error);
    }
  };

  // 전화 거절
  const handleRejectCall = async (roomId: string) => {
    const { callerId } = useCallStore.getState();
    if (!chatSocket || !callerId || !roomId) return;

    try {
      const response = await chatSocket.request('call:response', { callerId, accepted: false, roomId, });

      if (response.success) {
        setCallState({ callState: 'ended', roomId: undefined, callerId: undefined, callerName: undefined, callStartTime: undefined, });
        // 리소스 정리는 useCallStore에서 처리됨
        logger.info('📞 전화 거절 완료');
      } 

      logger.info('✅ 전화 거절 완료', response);
    } catch (error) {
      logger.error('❌ 전화 거절 중 오류:', error);
    }
  };

  // 전화 종료
  const handleEndCall = async (roomId: string) => {
    logger.info('✅ 전화 종료', roomId);
    if (!chatSocket || !roomId) return;

    try {
      const response = await chatSocket.request('call:end', { roomId,});

      if (response.success) {
        setCallState({ callState: 'ended', roomId: undefined, callerId: undefined, callerName: undefined, callStartTime: undefined, });
        // 리소스 정리는 useCallStore에서 처리됨
        logger.info('📞 전화 종료 완료');
      } else {
        logger.error('❌ 전화 종료 실패:', response.message);
      }
    } catch (error) {
      logger.error('❌ 전화 종료 중 오류:', error);
    }
  };

  return {
    handleInitiateCall,
    handleAcceptCall,
    handleRejectCall,
    handleEndCall,
  };
}
