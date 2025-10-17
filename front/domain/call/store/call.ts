import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getMediaStream, isLocalStreamValid } from '@/shared/utils/utils';
import { cleanupLocalOnlySync, cleanupMediaElement } from '../../mediasoup/service/callCleanup';

export type CallStateType =
  | 'inCall'
  | 'inComing'
  | 'outGoing'
  | 'inMatch'
  | 'inMatchWait'
  | 'ended';

export interface CallStateUpdate {
  callState: CallStateType;
  callerId?: string;
  callerName?: string;
  roomId?: string;
  callStartTime?: Date;
}

export interface Participant {
  // 유저정보
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  // dom 엘리먼트
  videoElement?: HTMLVideoElement | null | undefined;
  audioElement?: HTMLAudioElement | null | undefined;
  // 미디어 스트림
  videoStream?: MediaStream | null | undefined;
  audioStream?: MediaStream | null | undefined;
  // 미디어 상태
  isVideoEnabled?: boolean; // 해당 유저의 비디오 켜짐/꺼짐
  isMicEnabled?: boolean; // 해당 유저의 마이크 켜짐/꺼짐
  isAudioEnabled?: boolean; // 해당 유저가 소리를 들을 수 있는지
  // 화면공유 상태
  isScreenSharing?: boolean; // 해당 유저의 화면공유 상태
  screenElement?: HTMLVideoElement | null | undefined; // 화면공유 엘리먼트
  screenStream?: MediaStream | null | undefined; // 화면공유 스트림
}

interface CallState {
  // 통화 상태
  callState: CallStateType;
  callerId?: string;
  callerName?: string;
  roomId?: string;
  callStartTime?: Date;
  setCallState: (state: CallStateUpdate) => void;
  // 마스터 볼륨 관리
  isMasterVolumeEnabled: boolean;
  setMasterVolumeEnabled: (enabled: boolean) => void;
  // 로컬 미디어 스트림
  localStream: MediaStream | null;
  setupLocalStream: () => Promise<void>;
  // 권한 거부 모달
  isPermissionDeniedModalOpen: boolean;
  setIsPermissionDeniedModalOpen: (isOpen: boolean) => void;
  // 현재 사용자 (자기 자신)
  currentUser: Participant | null;
  setCurrentUser: (user: Participant) => void;
  updateCurrentUser: (updates: Partial<Participant>) => void;
  // 다른 참가자들 (자기 자신 제외)
  participants: Map<string, Participant>;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<Participant>) => void;
  clearParticipants: () => void;
}

export const useCallStore = create<CallState>()(
  devtools(
    (set, get) => ({
      // 초기 상태
      callState: 'ended' as CallStateType,
      callerId: undefined,
      callerName: undefined,
      roomId: undefined,
      callStartTime: undefined,
      currentUser: null,
      participants: new Map(),
      localStream: null,
      isPermissionDeniedModalOpen: false,
      isMasterVolumeEnabled: true,

      // Actions
      setCallState: state => {
        set(currentState => ({
          callState: state.callState ?? currentState.callState,
          callerId: state.callerId ?? currentState.callerId,
          callerName: state.callerName ?? currentState.callerName,
          roomId: state.roomId ?? currentState.roomId,
          callStartTime: state.callStartTime ?? currentState.callStartTime,
        }));

        // 통화 종료 시에만 자동 정리 (현재 사용자는 유지)
        if (state.callState === 'ended') {
          console.log('🧹state.callState === "ended" :', state.callState);
          cleanupLocalOnlySync(); // 자동으로 cleanup 실행
          // 화면공유 상태 초기화
          set(currentState => ({
            currentUser: currentState.currentUser
              ? {
                  ...currentState.currentUser,
                  isScreenSharing: false,
                  screenStream: undefined,
                }
              : null,
          }));
        }
      },

      setupLocalStream: async () => {
        const state = get();
        if (!state.currentUser) {
          console.error('❌ 로컬 미디어 스트림 설정 실패:', 'currentUser가 없습니다');
          return;
        }

        // prettier-ignore
        if (isLocalStreamValid(state.localStream)) {
          if (state.currentUser.videoElement && !state.currentUser.videoElement.srcObject && state.localStream!.getVideoTracks().length > 0) {
            state.currentUser.videoElement.srcObject = state.localStream;
          }
          if (state.currentUser.audioElement && !state.currentUser.audioElement.srcObject && state.localStream!.getAudioTracks().length > 0) {
            state.currentUser.audioElement.srcObject = state.localStream;
          }
          console.log('✅ 로컬 미디어 스트림 이미 설정되어 있습니다');
          return;
        }

        try {
          const defaultConstraints = {
            audio: true,
            video: {
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 },
              frameRate: { ideal: 15, max: 30 },
            },
          };

          const localStream = await getMediaStream(defaultConstraints);
          set({ localStream });

          // 기존 엘리먼트에 스트림이 있다면 정리 (state.callState === 'ended' 시 이미 정리되어 있지만 혹시 모를 경우 대비)
          cleanupMediaElement(state.currentUser?.videoElement, 'video');
          cleanupMediaElement(state.currentUser?.audioElement, 'audio');

          // 비디오 트랙이 있으면 비디오 엘리먼트에 연결
          if (state.currentUser.videoElement && localStream.getVideoTracks().length > 0) {
            state.currentUser.videoElement.srcObject = localStream;

            // 비디오 트랙 비활성화 (기본적으로 OFF 상태)
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
              videoTrack.enabled = false;
              state.currentUser.isVideoEnabled = false;
            } else {
              console.error('❌ 비디오 트랙이 없습니다');
            }
          }

          // 오디오 트랙이 있으면 오디오 엘리먼트에 연결
          if (state.currentUser.audioElement && localStream.getAudioTracks().length > 0) {
            state.currentUser.audioElement.srcObject = localStream;

            // 오디오 트랙 비활성화 (기본적으로 OFF 상태)
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
              audioTrack.enabled = false;
              state.currentUser.isAudioEnabled = false;
            } else {
              console.error('❌ 오디오 트랙이 없습니다');
            }
          }

          console.log('✅ 로컬 미디어 스트림 설정 완료');
        } catch (error) {
          set({ isPermissionDeniedModalOpen: true });
          throw error;
        }
      },

      // 권한 거부 모달 관리
      setIsPermissionDeniedModalOpen: isOpen => {
        set({ isPermissionDeniedModalOpen: isOpen });
      },

      // 현재 사용자 관리
      setCurrentUser: user => {
        set(state => {
          // console.log('🔍 setCurrentUser:', state);
          // DOM 엘리먼트 직접 생성
          const videoElement = document.createElement('video');
          const audioElement = document.createElement('audio');
          const screenElement = document.createElement('video');
          // 기본 속성 설정
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.muted = true; // 자기 자신의 비디오는 음소거
          videoElement.className = 'w-full h-full object-cover rounded-xl';

          screenElement.autoplay = true;
          screenElement.playsInline = true;
          screenElement.muted = true; // 자기 자신의 화면공유는 음소거
          screenElement.className = 'w-full h-full object-cover rounded-xl';

          audioElement.autoplay = true;
          audioElement.muted = true; // 자기 자신의 오디오는 음소거
          audioElement.className = 'hidden';

          return {
            currentUser: {
              userId: user.userId,
              userName: user.userName,
              userPhotoUrl: user.userPhotoUrl,
              videoElement: user.videoElement ?? videoElement,
              audioElement: user.audioElement ?? audioElement,
              screenElement: user.screenElement ?? screenElement,
              videoStream: user.videoStream ?? undefined,
              audioStream: user.audioStream ?? undefined,
              isVideoEnabled: user.isVideoEnabled ?? false,
              isAudioEnabled: user.isAudioEnabled ?? true,
              isMicEnabled: user.isMicEnabled ?? false,
              isScreenSharing: user.isScreenSharing ?? false,
              screenStream: user.screenStream ?? undefined,
            },
          };
        });
      },

      updateCurrentUser: updates => {
        set(state => ({
          currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null,
        }));
      },

      addParticipant: participant => {
        set(state => {
          const newParticipants = new Map(state.participants);

          // DOM 엘리먼트 직접 생성
          const videoElement = document.createElement('video');
          const audioElement = document.createElement('audio');
          const screenElement = document.createElement('video');

          // 기본 속성 설정
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.muted = true; // 다른 사용자 비디오는 음소거
          videoElement.className = 'w-full h-full object-cover rounded-xl';

          screenElement.autoplay = true;
          screenElement.playsInline = true;
          screenElement.muted = true; // 다른 사용자 화면공유는 음소거
          screenElement.className = 'w-full h-full object-cover rounded-xl';

          audioElement.autoplay = true;
          audioElement.muted = false; // 오디오 음소거 해제
          audioElement.volume = 1.0; // 기본 볼륨 설정
          audioElement.className = 'hidden';

          newParticipants.set(participant.userId, {
            userId: participant.userId,
            userName: participant.userName,
            userPhotoUrl: participant.userPhotoUrl,
            videoElement,
            audioElement,
            screenElement,
            videoStream: undefined,
            audioStream: undefined,
            isVideoEnabled: participant.isVideoEnabled ?? false,
            isAudioEnabled: participant.isAudioEnabled ?? true,
            isMicEnabled: participant.isMicEnabled ?? false,
            isScreenSharing: participant.isScreenSharing ?? false,
            screenStream: participant.screenStream ?? null,
          });

          console.log('✅ addParticipant:', participant.userId, 'new size:', newParticipants.size);
          return { participants: newParticipants };
        });
      },

      removeParticipant: userId => {
        set(state => {
          const newParticipants = new Map(state.participants);
          const participant = newParticipants.get(userId);

          // DOM 엘리먼트 정리
          cleanupMediaElement(participant?.videoElement, 'video');
          cleanupMediaElement(participant?.audioElement, 'audio');
          cleanupMediaElement(participant?.screenElement, 'screen');
          newParticipants.delete(userId);
          return { participants: newParticipants };
        });
      },

      updateParticipant: (userId, updates) => {
        set(state => {
          const newParticipants = new Map(state.participants);
          const participant = newParticipants.get(userId);
          if (participant) {
            newParticipants.set(userId, { ...participant, ...updates });
          }
          return { participants: newParticipants };
        });
      },

      clearParticipants: () => {
        set(state => {
          console.log('🧹 clearParticipants called, current size:', state.participants.size);
          // 다른 참가자들의 DOM 엘리먼트만 정리 (현재 사용자는 유지)
          state.participants.forEach(participant => {
            cleanupMediaElement(participant?.videoElement, 'video');
            cleanupMediaElement(participant?.audioElement, 'audio');
            cleanupMediaElement(participant?.screenElement, 'screen');
          });

          return { participants: new Map() };
        });
      },

      // 마스터 볼륨 관리
      setMasterVolumeEnabled: enabled => {
        set({ isMasterVolumeEnabled: enabled });
      },
    }),
    {
      name: 'call-store',
    }
  )
);
