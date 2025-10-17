'use client';

interface FriendsHeaderProps {
  activeTab: 'chat' | 'friends' | 'receivePending' | 'sendPending';
  setActiveTab: (tab: 'chat' | 'friends' | 'receivePending' | 'sendPending') => void;
  friendsCount: number;
  receivePendingCount: number;
  sendPendingCount: number;
  onAddFriend: () => void;
  setIsCreateChatRoomModalOpen: (isOpen: boolean) => void;
}

export function FriendsHeader({
  activeTab,
  setActiveTab,
  friendsCount,
  receivePendingCount,
  sendPendingCount,
  onAddFriend,
  setIsCreateChatRoomModalOpen,
}: FriendsHeaderProps) {
  return (
    <div className="h-12 bg-main-black-800 border-b border-main-black-700 flex items-center px-4">
      <div className="flex items-center gap-2">
        <button
          className={`${
            activeTab === 'friends' ? 'text-white' : 'text-neutral-400'
          } hover:text-white transition-colors`}
          onClick={() => setActiveTab('friends')}
        >
          친구 {friendsCount}
        </button>
        <>
          <span className="text-neutral-400">•</span>
          <button
            className={`${
              activeTab === 'receivePending' ? 'text-yellow-400' : 'text-neutral-400'
            } hover:text-yellow-400 transition-colors`}
            onClick={() => setActiveTab('receivePending')}
          >
            받은 요청 {receivePendingCount}
          </button>
        </>
        <>
          <span className="text-neutral-400">•</span>
          <button
            className={`${
              activeTab === 'sendPending' ? 'text-yellow-400' : 'text-neutral-400'
            } hover:text-yellow-400 transition-colors`}
            onClick={() => setActiveTab('sendPending')}
          >
            보낸 요청 {sendPendingCount}
          </button>
        </>
        {/* Add Friend Button */}
        <div className="ml-auto">
          <button
            className="px-3.5 py-1.5 bg-neutral-500 hover:bg-neutral-600 text-white rounded-md font-medium transition-colors text-sm"
            onClick={onAddFriend}
          >
            친구 추가
          </button>
        </div>
        <div className="ml-auto">
          <button
            className="px-3.5 py-1.5 bg-neutral-500 hover:bg-neutral-600 text-white rounded-md font-medium transition-colors text-sm"
            onClick={() => setIsCreateChatRoomModalOpen(true)}
          >
            채팅방 생성
          </button>
        </div>
      </div>
    </div>
  );
}
