'use client';

// prettier-ignore
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Video, VideoOff, MessageCircle, Minimize2, Maximize2, ScreenShare, ScreenShareOff } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth';
import { useCallStore } from '@/domain/call/store/call';
import { useChatStore } from '@/domain/chat/store/chat';
import { useMemo, useRef } from 'react';
import { Participant } from '@/domain/call/store/call';
import { useAudioDetection } from '@/shared/hooks/useAudioDetection';
import { useVolumeControl } from '@/shared/hooks/useVolumeControl';
import { VideoClone } from '@/domain/mediasoup/components/VideoClone';
import Image from 'next/image';
import { useMediasoupStore } from '../store/mediasoup';

interface SharedCallScreenProps {
  // 채팅 관련
  isOpenChatPanel: boolean;
  toggleChatPanel: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  toggleMic: () => void;
  toggleMasterVolume: () => void;
  onCallEnd: () => void;
  chatPanelWidth?: string;
}

export default function SharedCallScreen({
  isOpenChatPanel,
  toggleChatPanel,
  toggleVideo,
  toggleScreenShare,
  toggleMic,
  toggleMasterVolume,
  onCallEnd,
  chatPanelWidth = 'w-full lg:w-3/4',
}: SharedCallScreenProps) {
  // console.log('🔍 SharedCallScreen 렌더링');
  const { focusedUserId, toggleFocusedUserId } = useMediasoupStore();

  const { user } = useAuthStore();
  const callState = useCallStore(state => state.callState);
  const isMasterVolumeEnabled = useCallStore(state => state.isMasterVolumeEnabled);
  const roomId = useCallStore(state => state.roomId);

  const currentUser = useCallStore(state => state.currentUser);
  const participants = useCallStore(state => state.participants);

  const allUsers = useMemo(() => {
    const allUsers: Participant[] = [];
    if (currentUser) allUsers.push(currentUser);
    allUsers.push(...Array.from(participants.values()));
    return allUsers;
  }, [currentUser, participants]);

  // 현재 사용자 ID
  const currentUserId = user?.id || 'anonymous-user';
  const memberCount = allUsers.length;
  // 읽지 않은 메시지 수, 컨트롤 빠 분리 시켜야함
  const unreadCount = useChatStore(state => state.getUnreadCount(roomId || ''));

  // 포커스 사용자
  const focusedUser = allUsers.find(user => user.userId === focusedUserId) || allUsers[0];

  // 인원수에 따른 레이아웃 결정 (모바일/데스크탑 반응형)
  const mobileLayoutClass = useMemo(() => {
    if (memberCount <= 1) return 'grid-cols-1 grid-rows-1';
    if (memberCount <= 2) return 'grid-cols-1 grid-rows-2';
    if (memberCount <= 4) return 'grid-cols-2 grid-rows-2';
    if (memberCount <= 6) return 'grid-cols-2 grid-rows-3';
    if (memberCount <= 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-3 grid-rows-3';
  }, [memberCount]);

  const desktopLayoutClass = useMemo(() => {
    if (memberCount <= 1) return 'lg:grid-cols-1 lg:grid-rows-1';
    if (memberCount <= 2) return 'lg:grid-cols-2 lg:grid-rows-1';
    if (memberCount <= 4) return 'lg:grid-cols-2 lg:grid-rows-2';
    if (memberCount <= 6) return 'lg:grid-cols-3 lg:grid-rows-2';
    if (memberCount <= 9) return 'lg:grid-cols-3 lg:grid-rows-3';
    return 'lg:grid-cols-4 lg:grid-rows-3';
  }, [memberCount]);

  const memberButtonSize = useMemo(() => {
    if (memberCount <= 2) return 'h-4 w-4';
    if (memberCount <= 4) return 'h-3 w-3';
    return 'h-2 w-2';
  }, [memberCount]);

  const UserCard = ({
    participant,
    isMe = false,
    isFocused = false,
    memberCount,
  }: {
    participant: Participant;
    isMe?: boolean;
    isFocused?: boolean;
    memberCount: number;
  }) => {
    // console.log('🔍 UserCard 렌더링');

    const { user, isAuthenticated } = useAuthStore();

    const userCardRef = useRef<HTMLDivElement>(null);

    useAudioDetection({
      audioElement: participant.audioElement || null,
      isCurrentUser: isMe,
      elementRef: userCardRef, // DOM 요소 직접 전달
    });

    const {
      volume,
      showControls,
      localControlsRef,
      setShowControls,
      handleVolumeChange,
      handleVolumeWheel,
    } = useVolumeControl(participant.audioElement || null, !participant.isAudioEnabled);

    return (
      <div
        className="relative flex items-center justify-center bg-[#1a191a] rounded-xl 
        border border-main-black-700 transition-all duration-200 w-full h-full"
      >
        {/* 말할떄 보더 테두리 넣기  */}
        <div ref={userCardRef} className="absolute inset-0 user-card rounded-xl z-10"></div>
        {/* 배경 그라데이션 효과 */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent"></div>

        {/* 비디오가 비활성화된 경우 아바타 */}
        {!participant.isVideoEnabled && (
          <div className="relative flex items-center justify-center lg:w-32 lg:h-32 w-20 h-20 bg-main-black-750 rounded-full">
            {isMe && isAuthenticated && user?.photoUrl ? (
              <Image
                src={user.photoUrl}
                alt="user-avatar"
                width={128}
                height={128}
                className="rounded-full"
                unoptimized
              />
            ) : !isMe && participant.userPhotoUrl ? (
              <Image
                src={participant.userPhotoUrl}
                alt="user-avatar"
                width={128}
                height={128}
                className="rounded-full"
                unoptimized
              />
            ) : (
              <span className="text-white text-sm font-medium">
                {participant.userName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        )}

        {/* 오디오 스트림 - 원본 엘리먼트 직접 사용 */}
        {participant.audioElement && (
          <div
            ref={ref => {
              if (ref && participant.audioElement) {
                // 이미 추가된 엘리먼트가 있는지 확인
                if (!ref.contains(participant.audioElement)) {
                  ref.appendChild(participant.audioElement);
                }
              }
            }}
            className="hidden"
          />
        )}

        {/* 우측 상단 컨트롤 버튼 모음 */}
        <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
          {/* 마이크 상태 표시 */}
          {!participant.isMicEnabled && !isMe && (
            <div className="flex items-center gap-1 bg-red-500 p-2 rounded-full">
              <MicOff className={`text-white lg:w-4 lg:h-4 ${memberButtonSize}`} />
            </div>
          )}

          {/* 음소거 상태 표시 */}
          {!participant.isAudioEnabled && !isMe && (
            <div className="flex items-center gap-1 bg-red-500 p-2 rounded-full">
              <VolumeX className={`text-white lg:w-4 lg:h-4 ${memberButtonSize}`} />
            </div>
          )}

          {/* 포커스 버튼 (포커스 기능이 있는 경우에만) */}
          {toggleFocusedUserId && memberCount > 1 && (
            <button
              onClick={e => {
                e.stopPropagation();
                toggleFocusedUserId(participant.userId);
              }}
              className="p-2 bg-main-black-750 rounded-full transition-all duration-200 hover:bg-main-black-800 hover:scale-105"
              title={isFocused ? '포커스 해제' : '화면 크게 보기'}
            >
              {isFocused ? (
                <Minimize2 className={`text-white lg:w-4 lg:h-4 ${memberButtonSize}`} />
              ) : (
                <Maximize2 className={`text-white lg:w-4 lg:h-4 ${memberButtonSize}`} />
              )}
            </button>
          )}
        </div>

        {/* 개별 볼륨 조절 컨테이너 */}
        {!isMe && (
          <div ref={localControlsRef} className="absolute bottom-2 right-2 z-10">
            <button
              onClick={e => {
                e.stopPropagation();
                setShowControls(!showControls);
              }}
              className="p-2 bg-main-black-750 rounded-full transition-all duration-200 hover:bg-main-black-800 hover:scale-105"
              title={participant.isAudioEnabled ? '음소거' : '음소거 해제'}
              style={{
                backgroundColor: '#374151',
              }}
            >
              <Volume2 className={`text-white lg:w-4 lg:h-4 ${memberButtonSize}`} />
            </button>

            {/* 개별 볼륨 조절 팝오버 */}
            {showControls && (
              <div
                className="absolute bottom-10 right-0 h-30 w-8 bg-[#1a191a] border border-gray-700 rounded-xl p-2 shadow-lg"
                onWheel={handleVolumeWheel}
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange(participant.audioElement || null)}
                  className="absolute top-16 -translate-y-1/2 left-[13px] -translate-x-1/2 w-24 h-[3px] appearance-none cursor-pointer rotate-[-90deg] origin-top volume-slider"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume}%, #4b5563 ${volume}%, #4b5563 100%)`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* 사용자 이름 오버레이 */}
        {memberCount < 3 && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
            {participant.userName}
          </div>
        )}
      </div>
    );
  };

  // ========================================
  // =============  전체 레이아웃 ===============
  // ========================================

  // 미디어 쿼리가 준비되지 않았으면 렌더링하지 않음
  return (
    <div
      className={`relative h-full bg-[#131314] lg:p-4 p-2 overflow-hidden ${
        isOpenChatPanel ? chatPanelWidth : 'w-full'
      }`}
    >
      {focusedUserId && focusedUser && (
        <div className={`relative w-full h-full`}>
          <UserCard
            key={`${focusedUserId}`}
            participant={focusedUser}
            isMe={focusedUserId === currentUserId}
            isFocused={true}
            memberCount={memberCount}
          />

          {/* 분리해서 리렌더 방지 */}
          {focusedUser.videoElement &&
            focusedUser.isVideoEnabled &&
            !focusedUser.isScreenSharing && (
              <VideoClone
                videoElement={focusedUser.videoElement}
                isMe={focusedUserId === currentUserId}
                memberButtonSize={memberButtonSize}
                isScreenSharing={focusedUser.isScreenSharing}
              />
            )}

          {/* 화면공유 비디오 */}
          {focusedUser.screenElement && focusedUser.isScreenSharing && (
            <VideoClone
              videoElement={focusedUser.screenElement}
              isMe={focusedUserId === currentUserId}
              memberButtonSize={memberButtonSize}
              isScreenSharing={focusedUser.isScreenSharing}
            />
          )}
        </div>
      )}

      {!focusedUserId && (
        <div className={`grid ${desktopLayoutClass} ${mobileLayoutClass} gap-4 h-full`}>
          {allUsers.map(participant => (
            <div key={`${participant.userId}`} className="relative">
              <UserCard
                participant={participant}
                isMe={participant.userId === currentUserId}
                isFocused={participant.userId === focusedUserId}
                memberCount={memberCount}
              />

              {/* 분리해서 리렌더 방지 */}
              {/* 캠 비디오 */}
              {participant.videoElement &&
                participant.isVideoEnabled &&
                !participant.isScreenSharing && (
                  <VideoClone
                    videoElement={participant.videoElement}
                    isMe={participant.userId === currentUserId}
                    memberButtonSize={memberButtonSize}
                    isScreenSharing={participant.isScreenSharing}
                  />
                )}
              {/* 화면공유 비디오 */}
              {participant.screenElement && participant.isScreenSharing && (
                <VideoClone
                  videoElement={participant.screenElement}
                  isMe={participant.userId === currentUserId}
                  memberButtonSize={memberButtonSize}
                  isScreenSharing={participant.isScreenSharing}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 전체 컨트롤 바 (하단 중앙) */}
      {currentUser && (
        <div className="absolute lg:flex hidden bottom-6 left-1/2 transform -translate-x-1/2  items-center gap-4 bg-main-black-800 px-6 py-3 rounded-full border border-main-black-700 z-10">
          {/* 채팅 토글 */}
          <button
            onClick={toggleChatPanel}
            className={`relative p-3 bg-main-black-750 rounded-full transition-all duration-200 hover:scale-105 ${
              isOpenChatPanel ? 'bg-main-black-750' : ''
            }`}
            title={isOpenChatPanel ? '채팅 닫기' : '채팅 열기'}
          >
            <MessageCircle
              size={20}
              className={`${isOpenChatPanel ? 'text-blue-400' : 'text-white'}`}
            />
            {/* 읽지 않은 메시지가 있을 때만 알림 표시 */}
            {unreadCount > 0 && !isOpenChatPanel && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4.5 h-4.5 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </div>
            )}
          </button>

          {/* 화면공유 토글 */}
          <button
            onClick={toggleScreenShare}
            className="p-3 rounded-full transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: currentUser.isScreenSharing ? '#374151' : '#ef4444',
            }}
          >
            {currentUser.isScreenSharing ? (
              <ScreenShare size={20} className="text-white" />
            ) : (
              <ScreenShareOff size={20} className="text-white" />
            )}
          </button>

          {/* 비디오 토글 */}
          <button
            onClick={toggleVideo}
            className="p-3 rounded-full transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: !currentUser.isVideoEnabled ? '#ef4444' : '#374151',
            }}
            title={!currentUser.isVideoEnabled ? '비디오 켜기' : '비디오 끄기'}
          >
            {!currentUser.isVideoEnabled ? (
              <VideoOff size={20} className="text-white" />
            ) : (
              <Video size={20} className="text-white" />
            )}
          </button>

          {/* 마이크 토글 */}
          <button
            onClick={toggleMic}
            className="p-3 rounded-full transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: currentUser.isMicEnabled ? '#374151' : '#ef4444',
            }}
            title={currentUser.isMicEnabled ? '마이크 음소거' : '마이크 음소거 해제'}
          >
            {currentUser.isMicEnabled ? (
              <Mic size={20} className="text-white" />
            ) : (
              <MicOff size={20} className="text-white" />
            )}
          </button>

          {/* 전체 볼륨 토글 */}
          <button
            onClick={toggleMasterVolume}
            className="p-3 rounded-full transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: isMasterVolumeEnabled ? '#374151' : '#ef4444',
            }}
            title={isMasterVolumeEnabled ? '전체 볼륨 끄기' : '전체 볼륨 켜기'}
          >
            {isMasterVolumeEnabled ? (
              <Volume2 size={20} className="text-white" />
            ) : (
              <VolumeX size={20} className="text-white" />
            )}
          </button>

          {/* 통화 종료 */}
          {callState === 'inCall' ||
            (callState === 'inMatch' && (
              <button
                onClick={onCallEnd}
                className="p-3 bg-red-500 hover:bg-red-600 rounded-full transition-all duration-200 hover:scale-105"
                title="통화 종료"
              >
                <PhoneOff size={20} className="text-white" />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
