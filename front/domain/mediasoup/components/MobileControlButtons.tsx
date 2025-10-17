'use client';

// prettier-ignore
import { Mic, Volume2, MessageCircle, Video, VideoOff, MicOff, VolumeX, PhoneOff, ScreenShare, ScreenShareOff } from 'lucide-react';
import { useCallStore } from '@/domain/call/store/call';
import { useChatStore } from '@/domain/chat/store/chat';

interface MobileControlButtonsProps {
  isOpenChatPanel: boolean;
  toggleChatPanel: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  toggleMic: () => void;
  toggleMasterVolume: () => void;
  onCallEnd: () => void;
}

export default function MobileControlButtons({
  isOpenChatPanel,
  toggleChatPanel,
  toggleVideo,
  toggleScreenShare,
  toggleMic,
  toggleMasterVolume,
  onCallEnd,
}: MobileControlButtonsProps) {
  const currentUser = useCallStore(state => state.currentUser);
  const callState = useCallStore(state => state.callState);
  const isMasterVolumeEnabled = useCallStore(state => state.isMasterVolumeEnabled);
  const roomId = useCallStore(state => state.roomId);
  const unreadCount = useChatStore(state => state.getUnreadCount(roomId || ''));
  console.log('🔍 callState :', callState);

  return (
    <section className="flex items-center justify-center gap-4 px-4 py-3 bg-main-black-800 border-t border-main-black-700">
      {/* 채팅 토글 버튼 */}
      <button
        onClick={toggleChatPanel}
        className={`relative p-2 bg-main-black-750 rounded-full transition-all duration-200 active:scale-105 shadow-lg ${
          isOpenChatPanel ? 'bg-main-black-750' : ''
        }`}
        title={isOpenChatPanel ? '채팅 닫기' : '채팅 열기'}
      >
        <MessageCircle
          size={16}
          className={`${isOpenChatPanel ? 'text-blue-400' : 'text-white'}`}
        />
        {/* 읽지 않은 메시지가 있을 때만 알림 표시 */}
        {unreadCount > 0 && !isOpenChatPanel && (
          <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </div>
        )}
      </button>

      {/* 비디오 토글 버튼 */}
      <button
        onClick={toggleVideo}
        className="p-2 rounded-full transition-all duration-200 active:scale-105 shadow-lg"
        style={{
          backgroundColor: currentUser?.isVideoEnabled ? '#374151' : '#ef4444',
        }}
        title={currentUser?.isVideoEnabled ? '비디오 끄기' : '비디오 켜기'}
      >
        {!currentUser?.isVideoEnabled ? (
          <VideoOff size={16} className="text-white" />
        ) : (
          <Video size={16} className="text-white" />
        )}
      </button>

      {/* 화면공유 토글 버튼 */}
      <button
        onClick={toggleScreenShare}
        className="p-2 bg-main-black-750 rounded-full transition-all duration-200 active:scale-105"
        style={{
          backgroundColor: currentUser?.isScreenSharing ? '#374151' : '#ef4444',
        }}
        title={currentUser?.isScreenSharing ? '화면공유 끄기' : '화면공유 켜기'}
      >
        {!currentUser?.isScreenSharing ? (
          <ScreenShareOff size={16} className="text-white" />
        ) : (
          <ScreenShare size={16} className="text-white" />
        )}
      </button>

      {/* 마이크 토글 버튼 */}
      <button
        onClick={toggleMic}
        className="p-2 bg-main-black-750 rounded-full transition-all duration-200 active:scale-105"
        style={{
          backgroundColor: currentUser?.isMicEnabled ? '#374151' : '#ef4444',
        }}
        title={currentUser?.isMicEnabled ? '마이크 음소거' : '마이크 음소거 해제'}
      >
        {!currentUser?.isMicEnabled ? (
          <MicOff size={16} className="text-white" />
        ) : (
          <Mic size={16} className="text-white" />
        )}
      </button>

      {/* 전체 볼륨 조절 버튼 */}
      <button
        onClick={toggleMasterVolume}
        className="p-2 rounded-full transition-all duration-200 active:scale-105 shadow-lg"
        style={{
          backgroundColor: isMasterVolumeEnabled ? '#374151' : '#ef4444',
        }}
        title={isMasterVolumeEnabled ? '전체 볼륨 끄기' : '전체 볼륨 켜기'}
      >
        {!isMasterVolumeEnabled ? (
          <VolumeX size={16} className="text-white" />
        ) : (
          <Volume2 size={16} className="text-white" />
        )}
      </button>

      {/* 통화 종료 버튼 */}
      {(callState === 'inCall' || callState === 'inMatch') && (
        <button
          onClick={onCallEnd}
          className="p-2 bg-red-500 hover:bg-red-600 rounded-full transition-all duration-200 active:scale-105 shadow-lg"
          title="통화 종료"
        >
          <PhoneOff size={16} className="text-white" />
        </button>
      )}
    </section>
  );
}
