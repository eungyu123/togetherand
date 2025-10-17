import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FriendsHeaderMobile } from '@/domain/friend/components/FriendsHeader.mobile';
import { AddFriendModal } from '@/domain/friend/components/AddFriendModal';
import { CreateChatRoomModal } from '@/domain/chat/components/CreateChatRoomModal';
import MobileBottomNav from '@/shared/components/navigations/mobile.BottomNav';

export function FriendsMobileTemplate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // UI 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateChatRoomModalOpen, setIsCreateChatRoomModalOpen] = useState(false);

  // 현재 활성 탭 결정
  const getActiveTab = () => {
    if (pathname === '/friends') return 'friends';
    if (pathname.startsWith('/friends/chat')) return 'chat';
    if (pathname === '/friends/receive') return 'receivePending';
    if (pathname === '/friends/send') return 'sendPending';
    return 'friends';
  };

  // 탭 변경 처리
  const handleTabChange = (tab: string) => {
    switch (tab) {
      case 'friends':
        router.push('/friends');
        break;
      case 'chat':
        router.push('/friends/chat');
        break;
      case 'receivePending':
        router.push('/friends/receive');
        break;
      case 'sendPending':
        router.push('/friends/send');
        break;
    }
  };

  // 친구 추가 모달 처리
  const handleAddFriend = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="bg-main-black-900 h-dvh w-screen text-neutral-200 flex flex-col">
      <div className="flex flex-1 min-h-0">
        <FriendsHeaderMobile
          activeTab={getActiveTab()}
          setActiveTab={handleTabChange}
          onAddFriend={handleAddFriend}
          setIsCreateChatRoomModalOpen={setIsCreateChatRoomModalOpen}
        />
        <div className="flex-1 flex flex-col min-h-0 overflow-y-hidden">{children}</div>
      </div>

      <MobileBottomNav />

      <AddFriendModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <CreateChatRoomModal
        isOpen={isCreateChatRoomModalOpen}
        onClose={() => setIsCreateChatRoomModalOpen(false)}
      />
    </div>
  );
}
