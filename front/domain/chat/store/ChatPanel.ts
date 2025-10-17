import { create } from 'zustand';
interface ChatPanelState {
  isMatchChatPanelOpen: boolean;
  setIsMatchChatPanelOpen: (isMatchChatPanelOpen: boolean) => void;
  isChatRoomChatPanelOpen: boolean;
  setIsChatRoomChatPanelOpen: (isChatRoomChatPanelOpen: boolean) => void;
}

export const useChatPanelStore = create<ChatPanelState>((set, get) => ({
  isMatchChatPanelOpen: false,
  setIsMatchChatPanelOpen: (isMatchChatPanelOpen: boolean) => set({ isMatchChatPanelOpen }),
  isChatRoomChatPanelOpen: false,
  setIsChatRoomChatPanelOpen: (isChatRoomChatPanelOpen: boolean) =>
    set({ isChatRoomChatPanelOpen }),
}));
