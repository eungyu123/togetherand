import { ChatPanel, HeaderBar } from '@/app/(main)/components';
import MobileBottomNav from '@/shared/components/navigations/mobile.BottomNav';
import SharedCallScreen from '@/domain/mediasoup/components/SharedCallScreen';
import { MainPageProps } from '@/app/(main)/type';
import { SharedUserScreenList } from '@/domain/mediasoup/components/SharedUserScreenList';
import MobileControlButtons from '@/domain/mediasoup/components/MobileControlButtons';

export default function MobileTemplate({ callControlsProps, chatPanelProps }: MainPageProps) {
  return (
    <div className="bg-main-black-900 h-dvh w-screen text-neutral-200 flex flex-col">
      <HeaderBar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {chatPanelProps.isMatchChatPanelOpen ? (
          <ChatPanel />
        ) : (
          <SharedCallScreen
            isOpenChatPanel={chatPanelProps.isMatchChatPanelOpen}
            toggleChatPanel={callControlsProps.toggleChatPanel}
            toggleVideo={callControlsProps.toggleVideo}
            toggleMic={callControlsProps.toggleMic}
            toggleMasterVolume={callControlsProps.toggleMasterVolume}
            onCallEnd={callControlsProps.mediasoupEnd}
            toggleScreenShare={callControlsProps.toggleScreenShare}
            chatPanelWidth="w-full lg:w-3/4"
          />
        )}
      </div>

      {/* 유저 스크린 목록 */}
      <SharedUserScreenList />
      {/* 하단 컨트롤 바 */}
      <MobileControlButtons
        isOpenChatPanel={chatPanelProps.isMatchChatPanelOpen}
        toggleChatPanel={callControlsProps.toggleChatPanel}
        toggleVideo={callControlsProps.toggleVideo}
        toggleMic={callControlsProps.toggleMic}
        toggleMasterVolume={callControlsProps.toggleMasterVolume}
        toggleScreenShare={callControlsProps.toggleScreenShare}
        onCallEnd={callControlsProps.mediasoupEnd}
      />
      {/* 하단 네비게이션 */}
      <MobileBottomNav />
    </div>
  );
}
