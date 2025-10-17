import { ChatPanel, HeaderBar } from '@/app/(main)/components';
import { MainPageProps } from '@/app/(main)/type';
import SharedCallScreen from '@/domain/mediasoup/components/SharedCallScreen';
import { SharedUserScreenList } from '@/domain/mediasoup/components/SharedUserScreenList';
import SideNavBar from '@/shared/components/navigations/SideNavBar';

export default function DesktopTemplate({ ...props }: MainPageProps) {
  return (
    <div className="bg-main-black-900 h-dvh w-screen text-neutral-200">
      <div className="flex h-full">
        <SideNavBar />

        <div className="flex flex-col w-full">
          <HeaderBar />
          <div className="flex-1 flex overflow-hidden">
            <SharedCallScreen
              isOpenChatPanel={props.chatPanelProps.isMatchChatPanelOpen}
              toggleChatPanel={props.callControlsProps.toggleChatPanel}
              toggleVideo={props.callControlsProps.toggleVideo}
              toggleScreenShare={props.callControlsProps.toggleScreenShare}
              toggleMic={props.callControlsProps.toggleMic}
              toggleMasterVolume={props.callControlsProps.toggleMasterVolume}
              onCallEnd={props.callControlsProps.mediasoupEnd}
              chatPanelWidth="w-full lg:w-3/4"
            />
            {props.chatPanelProps.isMatchChatPanelOpen ? <ChatPanel /> : null}
          </div>
          <SharedUserScreenList />
        </div>
      </div>
    </div>
  );
}
