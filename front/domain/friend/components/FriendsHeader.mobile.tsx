'use client';

import { useChatActions } from '../../chat/hooks/useChatActions';
//prettier-ignore
import { Users, UserPlus, MessageCircle, UserCheck, MessageCirclePlus,} from 'lucide-react';

interface FriendsHeaderMobileProps {
  activeTab: 'chat' | 'friends' | 'receivePending' | 'sendPending';
  setActiveTab: (tab: 'chat' | 'friends' | 'receivePending' | 'sendPending') => void;
  onAddFriend: () => void;
  setIsCreateChatRoomModalOpen: (isOpen: boolean) => void;
}

export function FriendsHeaderMobile({
  activeTab,
  setActiveTab,
  onAddFriend,
  setIsCreateChatRoomModalOpen,
}: FriendsHeaderMobileProps) {
  const { useGetRoomUnreadCount } = useChatActions();
  const { data: unreadCount } = useGetRoomUnreadCount();

  // unreadCount가 객체인 경우 모든 값의 합계를 계산
  const allUnreadCount = unreadCount
    ? Object.values(unreadCount as Record<string, number>).reduce(
        (acc: number, curr: number) => acc + curr,
        0
      )
    : 0;

  return (
    <div className="flex flex-col items-center px-1 py-4 h-dvh bg-main-black-600 gap-4">
      {/* 채팅방 */}
      <button
        className={`relative ${
          activeTab === 'chat' ? 'text-white' : 'text-neutral-400'
        } hover:text-white transition-colors p-2`}
        onClick={() => setActiveTab('chat')}
        title="채팅방"
      >
        <MessageCircle size={16} />
        {allUnreadCount > 0 && (
          <div className="absolute -top-0 -right-0 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {allUnreadCount > 9 ? '9+' : allUnreadCount}
            </span>
          </div>
        )}
      </button>

      {/* 친구 */}
      <button
        className={`${
          activeTab === 'friends' ? 'text-white' : 'text-neutral-400'
        } hover:text-white transition-colors p-2`}
        onClick={() => setActiveTab('friends')}
        title="친구"
      >
        <Users size={16} />
      </button>

      {/* 받은 요청 */}
      <button
        className={`${
          activeTab === 'receivePending' ? 'text-white' : 'text-neutral-400'
        } hover:text-white transition-colors p-2`}
        onClick={() => setActiveTab('receivePending')}
        title="받은 요청"
      >
        <UserCheck size={16} />
      </button>

      {/* 보낸 요청 */}
      <button
        className={`${
          activeTab === 'sendPending' ? 'text-white' : 'text-neutral-400'
        } hover:text-white transition-colors p-2`}
        onClick={() => setActiveTab('sendPending')}
        title="보낸 요청"
      >
        <UserPlus size={16} />
      </button>

      {/* 친구 추가 */}
      <button
        className="p-2 bg-neutral-600 hover:bg-neutral-600 text-white rounded-xs transition-colors"
        onClick={onAddFriend}
        title="친구 추가"
      >
        <UserPlus size={16} />
      </button>

      {/* 채팅방 생성 */}
      <button
        className="p-2 bg-neutral-600 hover:bg-neutral-600 text-white rounded-xs transition-colors"
        onClick={() => setIsCreateChatRoomModalOpen(true)}
        title="채팅방 생성"
      >
        <MessageCirclePlus size={16} />
      </button>
    </div>
  );
}
