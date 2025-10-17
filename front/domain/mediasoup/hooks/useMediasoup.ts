import { useSocket } from '@/shared/components/providers/SocketProvider';
import { useEffect } from 'react';
import { mediaSoupService } from '@/domain/mediasoup/service/mediaSoupService';
import { logger } from '@/shared/utils/logger';
import { useAuthStore } from '@/shared/stores/auth';
import { useCallStore } from '@/domain/call/store/call';
import { cleanupUserResourcesSync } from '@/domain/mediasoup/service/callCleanup';
import { useChatStore } from '@/domain/chat/store/chat';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export const useMediasoup = () => {
  const user = useAuthStore(state => state.user);
  const router = useRouter();
  const { mediasoupSocket, chatSocket, matchSocket } = useSocket();
  const { updateParticipant, updateCurrentUser, setupLocalStream, addParticipant, setCallState } =
    useCallStore.getState();

  useEffect(() => {
    if (!mediasoupSocket) return;

    // prettier-ignore
    const init = async () => {
      try {
        // 매칭 성공 이벤트 (랜덤 매칭)
        matchSocket?.on('match:match_success', async data => {
          const { roomId, rtpCapabilities, opponentsUser } = data;

          await setupLocalStream();

          const { currentUser, participants } = useCallStore.getState();
          if (currentUser) {
            updateCurrentUser({ isMicEnabled: false, isVideoEnabled: false });
          }

          // 상대방 추가
          if (opponentsUser && !participants.has(opponentsUser.userId)) {
            addParticipant({
              userId: opponentsUser.userId,
              userName: opponentsUser.userName,
              userPhotoUrl: opponentsUser.photoUrl,
            });
          }

          // 랜덤 매치일 시작 시 채팅 삭제
          useChatStore.getState().clearMessages(roomId);

          // 룸 아이디 설정 (랜덤 매치로 표시)
          setCallState({ callState: 'inMatch', roomId: roomId, });

          // 미디어소프 초기화
          await mediaSoupService.initializeDevice(rtpCapabilities);

          // 전송 트랜스포트 생성
          const send_transport_option = await mediasoupSocket.request('client:create_send_transport', { roomId: roomId });
          const send_transport = await mediaSoupService.createSendTransport(mediasoupSocket, roomId, send_transport_option);
          if (send_transport) {
            logger.info('✅ 전송 트랜스포트 생성 완료:', send_transport);
          }

          // 수신 트랜스포트 생성
          const recv_transport_option = await mediasoupSocket.request('client:create_recv_transport', { roomId: roomId });
          const recv_transport = await mediaSoupService.createRecvTransport(mediasoupSocket, roomId, recv_transport_option);
          if (recv_transport) {
            logger.info('✅ 수신 트랜스포트 생성 완료:', recv_transport);
          }

          const { localStream } = useCallStore.getState();
          if (send_transport && localStream) {
            try {
              console.log('🔍 매칭 프로듀서 생성 시작');
              const producer = await mediaSoupService.createProducer(send_transport, localStream);
              if (producer) {
                mediaSoupService.pauseProducer('video');
                mediaSoupService.pauseProducer('audio');
              }
            } catch (error) {
              logger.error('❌ 매칭 프로듀서 생성 실패:', error);
              throw error;
            }
          } else {
            // 프로듀서 생성 실패 시에도 상대방 프로듀서 요청
            logger.warn('⚠️ 전송 트랜스포트 또는 로컬 미디어 스트림이 없습니다');
          }
                          
          mediasoupSocket.getSocket?.emit('client:get_producers', { roomId: roomId });
          router.push(`/`); // Next.js가 자동으로 중복 방지
          logger.info('✅ 매칭 성공');
        });

        // 친구 전화 성공 이벤트 (기존 로직)
        chatSocket?.on('call:success', async data => {
          const { roomId, rtpCapabilities, } = data;
          const { currentUser } = useCallStore.getState();

          // 로컬 미디어 스트림 설정 전화를 기본적으로 요청, 응답 할때 설정됨
          await setupLocalStream(); 

          if (currentUser) {
            updateCurrentUser({ isMicEnabled: false, isVideoEnabled: false });
          }
          // 상대방 추가 => (useCallManagement에서 추가됨)
          // 룸 아이디 설정 => (useCallManagement에서 설정됨)

          // 미디어 소프 초기화
          await mediaSoupService.initializeDevice(rtpCapabilities);

          // 전송 트랜스포트 생성
          const send_transport_option = await mediasoupSocket.request('client:create_send_transport', { roomId: roomId });
          const send_transport = await mediaSoupService.createSendTransport(mediasoupSocket, roomId, send_transport_option);
          if (send_transport) {
            logger.info('✅ 전송 트랜스포트 생성 완료:', send_transport);
          }

          // 수신 트랜스포트 생성
          const recv_transport_option = await mediasoupSocket.request('client:create_recv_transport', { roomId: roomId });
          const recv_transport = await mediaSoupService.createRecvTransport(mediasoupSocket, roomId, recv_transport_option);
          if (recv_transport) {
            logger.info('✅ 수신 트랜스포트 생성 완료:', recv_transport);
          }

          const { localStream } = useCallStore.getState();
          if (send_transport && localStream) {
            try {
              console.log('🔍 친구 전화 프로듀서 생성 시작');
              const producer = await mediaSoupService.createProducer(send_transport, localStream);
              if (producer) {
                mediaSoupService.pauseProducer('video');
                mediaSoupService.pauseProducer('audio');
                
                logger.info('✅ 친구 전화 프로듀서 생성 완료, 상대방 프로듀서 요청 시작');
              } else {
                logger.warn('⚠️ 친구 전화 프로듀서 생성 실패');
              }
            } catch (error) {
              logger.error('❌ 친구 전화 프로듀서 생성 실패:', error);
              throw error;
            }
          } else {
            logger.warn('⚠️ 전송 트랜스포트 또는 로컬 미디어 스트림이 없습니다');
          }

          mediasoupSocket.getSocket?.emit('client:get_producers', { roomId: roomId });
          
          setCallState({ callState: 'inCall', roomId: roomId,});
          router.push(`/friends/chat/${roomId}`); // Next.js가 자동으로 중복 방지
          logger.info('✅ 친구 전화 성공');
        });

        // @ 상대방 프로듀서로 부터 컨슈머 생성
        mediasoupSocket.on('server:new_producer', async data => {
          const producers = data;
          if (!Array.isArray(producers) || producers.length === 0) {
            logger.warn('⚠️ 상대방 프로듀서가 없습니다');
            return;
          }

          const { roomId } = useCallStore.getState();
          const recvTransport = mediaSoupService.getRecvTransport();
          if (!recvTransport || !roomId) {
            logger.error('❌ 수신 트랜스포트 또는 룸 ID가 없습니다', recvTransport, roomId);
            // 이런 경우를 대비해서 내가 수신 트랜스 포트를 만들었을때 상대방 프로듀서 요청을 해야함
            return;
          }


          // 각 프로듀서에 대해 컨슈머 생성
          for (const producerData of producers) {
            const { producerId, userId: producerUserId, trackType } = producerData;

            const consumer_option = await mediasoupSocket.request('client:consume', {
              roomId: roomId,
              producerId,
              rtpCapabilities: mediaSoupService.getDevice?.rtpCapabilities,
              transportId: recvTransport?.id,
              trackType: trackType,
            });
            if (!consumer_option.success) continue;

            // 상대방 참가자 정보 가져오기
            const { participants } = useCallStore.getState();
            const participant = participants.get(producerUserId);
            const videoElement = participant?.videoElement || null;
            const audioElement = participant?.audioElement || null;
            const screenElement = participant?.screenElement || null;

            const consumer = await mediaSoupService.createConsumer(roomId, recvTransport, consumer_option);
            if (!consumer) continue;

            // 스트림을 참가자의 엘리먼트에 직접 연결
            const stream = new MediaStream([consumer.track]);
            if (consumer_option.trackType === 'video' && videoElement) {
              videoElement.srcObject = stream;
              updateParticipant(producerUserId, { videoElement });
            } else if (consumer_option.trackType === 'screen' && screenElement) {
              screenElement.srcObject = stream;
              updateParticipant(producerUserId, { isScreenSharing: true, screenElement });
            } else if (consumer_option.trackType === 'audio' && audioElement) {
              audioElement.srcObject = stream;
              audioElement.muted = false; // 오디오 음소거 해제
              audioElement.volume = 1.0; // 볼륨 설정
              updateParticipant(producerUserId, { audioElement });
            } else {
              logger.warn('⚠️ 컨슈머 생성 실패', consumer_option.trackType);
            }

            logger.info('✅ 컨슈머 생성 완료', consumer.id, 'for user:', producerUserId);
          }
        });

        // @ 상대방이 화면공유 시작
        mediasoupSocket.on('server:screen_share_start', data => {
          const { userId } = data;
          logger.info('✅ 상대방 화면공유 시작', userId);
          // 위에서 프로듀서 생성했을때 컨슈머 생성과 동시에 해야지 리렌더 한번으로 비디오 보임
          // updateParticipant(userId, { isScreenSharing: true }); 
        });

        // @ 상대방이 화면공유 종료
        mediasoupSocket.on('server:screen_share_stop', data => {
          const { userId, screenProducerId } = data;
          logger.info('✅ 상대방 화면공유 종료', userId);
          
          // 화면공유 컨슈머 정리
          const { roomId, participants } = useCallStore.getState();
          if (roomId && screenProducerId) {
            mediaSoupService.closeUserConsumers(roomId, [ { producerId: screenProducerId, trackType: 'screen' }, ]);          
          }
          
          // 화면공유 DOM 엘리먼트 정리
          const participant = participants.get(userId);
          if (participant?.screenElement) {
            participant.screenElement.srcObject = null;
          }
          
          // 참가자 상태 업데이트
          updateParticipant(userId, { isScreenSharing: false });
        });

        // @ 상대방 producer 정지 (마이크/비디오 끔)
        mediasoupSocket.on('server:producer_paused', data => {
          const { userId, trackType } = data;
          logger.info('✅ 상대방 producer 정지', userId, trackType);
          if (trackType === 'video') {
            updateParticipant(userId, { isVideoEnabled: false });
          } else if (trackType === 'audio') {
            updateParticipant(userId, { isMicEnabled: false });
          }
        });

        // @ 상대방 producer 재개 (마이크/비디오 켬)
        mediasoupSocket.on('server:producer_resumed', data => {
          const { userId, trackType } = data;
          logger.info('✅ 상대방 producer 재개', userId, trackType);
          if (trackType === 'video') {
            updateParticipant(userId, { isVideoEnabled: true });
          } else if (trackType === 'audio') {
            updateParticipant(userId, { isMicEnabled: true });
          } 
        });

        // @ 상대방이 음소거 켜짐
        mediasoupSocket.on('server:volume_mute_on', data => {
          const { userId, } = data;
          updateParticipant(userId, { isAudioEnabled: true });
        });

        // @ 상대방이 음소거 끄짐
        mediasoupSocket.on('server:volume_mute_off', data => {
          const { userId, } = data;
          updateParticipant(userId, { isAudioEnabled: false }); 
        });

        // @ 상대방 퇴장
        mediasoupSocket.on('server:user_left', async data => {
          const { userKey, userName, timestamp, producerInfos } = data;
          logger.debug('❌ 상대방 퇴장', userKey, userName, timestamp);

          // 나간 유저 리소스 정리 함수 사용
          const { roomId } = useCallStore.getState();
          cleanupUserResourcesSync(userKey, roomId, producerInfos);
        });

        mediasoupSocket.on('server:mediasoup_end', async data => {
          const { roomId } = data;
          const callState = useCallStore.getState().callState;
          if (callState === 'inCall') {
            toast.success('전화 종료');
          } else {
            toast.success('매칭 종료');
          }
          setCallState({ callState: 'ended', roomId: undefined, callerId: undefined, callerName: undefined, callStartTime: undefined, });
          // 리소스 정리는 useCallStore에서 처리됨
        });
      } catch (error) {
        logger.error('❌ 미디어소프 소켓 초기화 실패:', error);
      }
    };

    init();

    return () => {
      // (서버에서 연결끊김 처리해주면됨 클라이언트는 처리하지 않음)
      // 1. 매칭 삭제 알림 서버로 전송

      // const { roomId } = useCallStore.getState();
      // if (roomId) {
      // mediasoupSocket.getSocket?.emit('client:delete_match', { roomId: roomId });
      // }

      mediasoupSocket.off('server:match_success');
      mediasoupSocket.off('server:new_producer');
      mediasoupSocket.off('server:producer_paused');
      mediasoupSocket.off('server:producer_resumed');
      mediasoupSocket.off('server:mediasoup_end');
      mediasoupSocket.off('server:volume_mute_on');
      mediasoupSocket.off('server:volume_mute_off');
      mediasoupSocket.off('server:screen_share_start');
      mediasoupSocket.off('server:screen_share_stop');
      mediasoupSocket.off('server:user_left');
      mediasoupSocket.off('server:match_ended');
      chatSocket?.off('call:success');
      matchSocket?.off('match:match_success');
    };
  }, [mediasoupSocket, chatSocket, matchSocket, user?.id]);

  /**
   * 전화 종료 (매칭 종료)
   */
  // prettier-ignore
  const deleteMatch = async () => {
    if (!mediasoupSocket) return;
    try {
      // 1. 매칭 삭제 알림 서버로 전송 (Transport 정리 전에!)
      const { roomId } = useCallStore.getState();
      if (!roomId) return;
      mediasoupSocket.getSocket?.emit('client:mediasoup_end', { roomId: roomId });

      setCallState({ callState: 'ended', roomId: undefined, callerId: undefined, callerName: undefined, callStartTime: undefined, });
      // 리소스 정리는 useCallStore에서 처리됨
      logger.debug('✅ 매칭 종료 완료');
    } catch (error) {
      setCallState({ callState: 'ended', roomId: undefined, callerId: undefined, callerName: undefined, callStartTime: undefined, });
      throw error;
    }
  };

  return { deleteMatch };
};
