'use client';

import { useParams } from 'next/navigation';
import { useCallStore } from '@/domain/call/store/call';
import { MessageList } from './components/MessageList';
import { MessageInputComponent } from './components/MessageInput';
import SharedCallScreen from '@/domain/mediasoup/components/SharedCallScreen';
import { useCallControls } from '@/domain/mediasoup/hooks/useCallControls';
import { useChatRoom } from '../../../../domain/chat/hooks/useChatRoom';
import MobileControlButtons from '@/domain/mediasoup/components/MobileControlButtons';
import { SharedUserScreenList } from '@/domain/mediasoup/components/SharedUserScreenList';
import { useChatPanelStore } from '@/domain/chat/store/ChatPanel';

export default function ChatRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  const callState = useCallStore(state => state.callState);
  const { isChatRoomChatPanelOpen } = useChatPanelStore();

  const {
    toggleVideo,
    toggleMic,
    toggleMasterVolume,
    toggleChatPanel,
    toggleScreenShare,
    mediasoupEnd,
  } = useCallControls();

  // 채팅 관련 로직을 훅으로 분리
  const {
    messages,
    isTyping,
    handleSendMessage,
    loadMoreMessages,
    isLoadingMore,
    hasMoreMessages,
    isInitialLoading,
  } = useChatRoom(roomId);

  // 전화 종료
  const onCallEnd = async () => {
    await mediasoupEnd();
  };

  return callState === 'inCall' && !isChatRoomChatPanelOpen ? (
    <>
      <SharedCallScreen
        isOpenChatPanel={isChatRoomChatPanelOpen}
        toggleChatPanel={toggleChatPanel}
        toggleVideo={toggleVideo}
        toggleMic={toggleMic}
        toggleMasterVolume={toggleMasterVolume}
        onCallEnd={onCallEnd}
        toggleScreenShare={toggleScreenShare}
      />
      <SharedUserScreenList />
      <MobileControlButtons
        isOpenChatPanel={isChatRoomChatPanelOpen}
        toggleChatPanel={toggleChatPanel}
        toggleVideo={toggleVideo}
        toggleScreenShare={toggleScreenShare}
        toggleMic={toggleMic}
        toggleMasterVolume={toggleMasterVolume}
        onCallEnd={onCallEnd}
      />
    </>
  ) : (
    <>
      <MessageList
        messages={messages}
        isTyping={isTyping}
        roomId={roomId}
        onLoadMore={loadMoreMessages}
        isLoadingMore={isLoadingMore}
        hasMoreMessages={hasMoreMessages}
        isInitialLoading={isInitialLoading}
      />
      <MessageInputComponent roomId={roomId} onSendMessage={handleSendMessage} />
      {callState === 'inCall' && isChatRoomChatPanelOpen ? (
        <MobileControlButtons
          isOpenChatPanel={isChatRoomChatPanelOpen}
          toggleChatPanel={toggleChatPanel}
          toggleVideo={toggleVideo}
          toggleScreenShare={toggleScreenShare}
          toggleMic={toggleMic}
          toggleMasterVolume={toggleMasterVolume}
          onCallEnd={onCallEnd}
        />
      ) : null}
    </>
  );
}
