// 게임 타입 옵션들
export const gameTypes = [
  { value: 'any_option', label: '상관 없음' },
  { value: 'leagueoflegends', label: '리그 오브 레전드' },
  { value: 'tft', label: '롤토체스' },
  { value: 'overwatch', label: '오버워치' },
  { value: 'valorant', label: '발로란트' },
];

export interface callControlsProps {
  onCallEnd: () => void;
  toggleChatPanel: () => void;
  toggleVideo: () => void;
  toggleMic: () => void;
  toggleMasterVolume: () => void;
  toggleScreenShare: () => void;
  mediasoupEnd: () => void;
}

export interface chatPanelProps {
  isMatchChatPanelOpen: boolean;
  setIsMatchChatPanelOpen: (isMatchChatPanelOpen: boolean) => void;
}

export interface MainPageProps {
  callControlsProps: callControlsProps;
  chatPanelProps: chatPanelProps;
}
