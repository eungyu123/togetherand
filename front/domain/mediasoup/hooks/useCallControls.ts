'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useSocket } from '@/shared/components/providers/SocketProvider';
import { useCallStore } from '@/domain/call/store/call';
import { useChatStore } from '@/domain/chat/store/chat';
import { useChatPanelStore } from '@/domain/chat/store/ChatPanel';
import { mediaSoupService } from '@/domain/mediasoup/service/mediaSoupService';
import { logger } from '@/shared/utils/logger';
import { toast } from 'react-hot-toast';

export const useCallControls = () => {
  const { mediasoupSocket, chatSocket } = useSocket();
  const pathname = usePathname();

  const toggleVideo = useCallback(async () => {
    const { currentUser, callState, roomId, localStream, setupLocalStream, updateCurrentUser } =
      useCallStore.getState();
    if (!currentUser) {
      logger.error('❌ 비디오 토글 실패:', 'currentUser가 없습니다');
      return;
    }

    // 1. 로컬 스트림이 없으면 먼저 설정
    if (!currentUser.videoElement?.srcObject) {
      console.error('currentUser.videoElement.srcObject가 없습니다');
      await setupLocalStream();
    }

    // 2. 스트림이 여전히 없으면 종료
    if (!currentUser.videoElement?.srcObject) {
      logger.error('❌ 비디오 토글 실패:', 'currentUser.videoElement.srcObject가 없습니다');
      return;
    }

    const stream = currentUser.videoElement.srcObject as MediaStream;
    const videoTrack = stream.getVideoTracks()[0];

    // 3. 비디오 트랙이 없으면 종료
    if (!videoTrack) {
      logger.error('❌ 비디오 토글 실패:', 'videoTrack가 없습니다');
      return;
    }

    const newVideoState = !currentUser.isVideoEnabled;

    // 4. 통화 중일 때만 미디어서버에 알림
    if (callState === 'inCall' || callState === 'inMatch') {
      if (newVideoState) {
        videoTrack.enabled = true;
        mediaSoupService.resumeProducer('video');
        await mediasoupSocket?.request('client:producer_resume', {
          roomId: roomId,
          trackType: 'video',
        });
      } else {
        videoTrack.enabled = false;
        mediaSoupService.pauseProducer('video');
        await mediasoupSocket?.request('client:producer_pause', {
          roomId: roomId,
          trackType: 'video',
        });
      }
    }

    if (callState !== 'inCall' && callState !== 'inMatch') {
      if (newVideoState) {
        videoTrack.enabled = true;
      } else {
        videoTrack.enabled = false;
        // currentUser 엘리먼트 정리
        const { currentUser: currentUserState } = useCallStore.getState();
        if (currentUserState) {
          if (currentUserState.videoElement) {
            currentUserState.videoElement.srcObject = null;
          }
          if (currentUserState.audioElement) {
            currentUserState.audioElement.srcObject = null;
          }
        }
      }
    }

    // 5. UI 상태 업데이트
    updateCurrentUser({ isVideoEnabled: newVideoState });
  }, [mediasoupSocket]);

  const toggleMic = useCallback(async () => {
    const { currentUser, roomId, updateCurrentUser, setupLocalStream } = useCallStore.getState();
    if (!currentUser || !roomId) {
      console.error('마이크 토글 실패:', 'currentUser 또는 roomId가 없습니다');
      return;
    }

    // 1. 로컬 스트림이 없으면 먼저 설정
    if (!currentUser.audioElement?.srcObject) {
      await setupLocalStream();
    }

    const stream = currentUser.audioElement?.srcObject as MediaStream;
    const audioTrack = stream?.getAudioTracks()[0];

    // 2. 스트림이 여전히 없으면 종료
    if (!currentUser.audioElement?.srcObject) return;

    // 3. 비디오 트랙이 없으면 종료
    if (!audioTrack) return;

    const newMuteState = !currentUser.isMicEnabled;
    if (newMuteState) {
      audioTrack.enabled = true;
      mediaSoupService.resumeProducer('audio');
      await mediasoupSocket?.request('client:producer_resume', {
        roomId: roomId,
        trackType: 'audio',
      });
    } else {
      audioTrack.enabled = false;
      mediaSoupService.pauseProducer('audio');
      await mediasoupSocket?.request('client:producer_pause', {
        roomId: roomId,
        trackType: 'audio',
      });
    }

    updateCurrentUser({ isMicEnabled: newMuteState });
  }, [mediasoupSocket]);

  const toggleMasterVolume = useCallback(async () => {
    const { roomId, isMasterVolumeEnabled, setMasterVolumeEnabled } = useCallStore.getState();
    if (!roomId) {
      console.error('마스터 볼륨 토글 실패:', 'roomId가 없습니다');
      return;
    }

    const newMasterVolumeState = !isMasterVolumeEnabled;
    setMasterVolumeEnabled(newMasterVolumeState);
    if (newMasterVolumeState) {
      await mediasoupSocket?.request('client:volume_mute_on', {
        roomId: roomId,
      });
    } else {
      await mediasoupSocket?.request('client:volume_mute_off', {
        roomId: roomId,
      });
    }
  }, [mediasoupSocket]);

  const toggleScreenShare = useCallback(async () => {
    const { currentUser, callState, roomId, updateCurrentUser } = useCallStore.getState();
    if (!currentUser || (callState !== 'inCall' && callState !== 'inMatch') || !roomId) {
      console.error('화면공유 토글 실패:', 'currentUser 또는 callState 또는 roomId가 없습니다');
      return;
    }

    try {
      if (!currentUser.isScreenSharing) {
        // 1. 화면공유 스트림을 screenElement에 직접 연결
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        if (currentUser.screenElement) {
          currentUser.screenElement.srcObject = screenStream;
        }

        // 2. 화면공유 프로듀서 생성
        const sendTransport = mediaSoupService.getSendTransport();
        if (!sendTransport) return;

        const screenProducer = await mediaSoupService.createScreenProducer(
          sendTransport,
          screenStream
        );
        if (!screenProducer) return;

        await mediasoupSocket?.request('client:screen_share_start', {
          roomId: roomId,
        });

        // 3. 화면공유 종료 이벤트 리스너
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare(); // 자동으로 화면공유 종료
        };

        // 4. 화면공유 상태 업데이트
        updateCurrentUser({ isScreenSharing: true, screenStream: screenStream });
      } else {
        // 화면공유 종료
        // 1. 미디어소프 서비스에서 화면공유 프로듀서 종료
        mediaSoupService.closeProducer('screen');

        // 2. 화면공유 스트림 정리
        const screenStream = currentUser.screenElement?.srcObject as MediaStream;
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
        }
        currentUser.screenElement!.srcObject = null;

        // 3. 서버에 화면공유 종료 알림
        await mediasoupSocket?.request('client:screen_share_stop', {
          roomId: roomId,
        });

        // 4. 화면공유 상태 업데이트
        updateCurrentUser({ isScreenSharing: false, screenStream: null });
      }
    } catch (error) {
      console.error('화면공유 토글 실패:', error);
    }
  }, [mediasoupSocket]);

  const toggleChatPanel = useCallback(() => {
    const { roomId } = useCallStore.getState();
    const { clearMessages } = useChatStore.getState();
    const {
      isMatchChatPanelOpen,
      setIsMatchChatPanelOpen,
      isChatRoomChatPanelOpen,
      setIsChatRoomChatPanelOpen,
    } = useChatPanelStore.getState();

    // pathname에 따라 다른 채팅 패널 토글
    if (pathname === '/') {
      setIsMatchChatPanelOpen(!isMatchChatPanelOpen);
    } else if (pathname.startsWith('/friends/chat')) {
      setIsChatRoomChatPanelOpen(!isChatRoomChatPanelOpen);
    }

    if (!roomId) {
      clearMessages('solo_chat_room');
    }
  }, [pathname]);

  const mediasoupEnd = useCallback(async () => {
    if (!mediasoupSocket) {
      return;
    }
    const { setCallState } = useCallStore.getState();

    try {
      const { roomId, callState } = useCallStore.getState();
      if (!roomId) {
        return;
      }

      mediasoupSocket.getSocket?.emit('client:mediasoup_end', { roomId: roomId });
      if (callState === 'inCall' && chatSocket) {
        chatSocket.request('call:end', { roomId: roomId });
        toast.success('전화 종료');
      } else {
        toast.success('매칭 종료');
      }

      setCallState({
        callState: 'ended',
        roomId: undefined,
        callerId: undefined,
        callerName: undefined,
        callStartTime: undefined,
      });
      logger.debug('✅ 매칭 종료 완료');
    } catch (error) {
      setCallState({
        callState: 'ended',
        roomId: undefined,
        callerId: undefined,
        callerName: undefined,
        callStartTime: undefined,
      });
      throw error;
    }
  }, [mediasoupSocket, chatSocket]);

  return {
    toggleVideo,
    toggleMic,
    toggleMasterVolume,
    toggleChatPanel,
    toggleScreenShare,
    mediasoupEnd,
  };
};
