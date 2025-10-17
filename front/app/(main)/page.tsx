'use client';

import DesktopTemplate from '@/app/(main)/template/desktop.template';
import MobileTemplate from '@/app/(main)/template/mobile.template';
import { useChatPanelStore } from '@/domain/chat/store/ChatPanel';
import { useCallControls } from '@/domain/mediasoup/hooks/useCallControls';
import { useMediaContext } from '@/shared/components/providers/MediaProvider';

export default function Home() {
  // console.log('🔍 Home 렌더링');

  const { isDesktop } = useMediaContext();

  const {
    toggleVideo,
    toggleMic,
    toggleMasterVolume,
    toggleChatPanel,
    toggleScreenShare,
    mediasoupEnd,
  } = useCallControls();

  const { isMatchChatPanelOpen, setIsMatchChatPanelOpen } = useChatPanelStore();

  const callControlsProps = {
    onCallEnd: mediasoupEnd,
    toggleChatPanel,
    toggleVideo,
    toggleMic,
    toggleMasterVolume,
    toggleScreenShare,
    mediasoupEnd,
  };

  const chatPanelProps = {
    isMatchChatPanelOpen,
    setIsMatchChatPanelOpen,
  };

  // 미디어 쿼리로 조건부 렌더링 - 하나의 템플릿만 렌더링
  return isDesktop ? (
    <DesktopTemplate callControlsProps={callControlsProps} chatPanelProps={chatPanelProps} />
  ) : (
    <MobileTemplate callControlsProps={callControlsProps} chatPanelProps={chatPanelProps} />
  );
}
