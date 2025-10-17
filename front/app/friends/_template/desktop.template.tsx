import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SideNavBar from '@/shared/components/navigations/SideNavBar';
import { RoomList } from '@/app/friends/_components/RoomList';
import { FriendsHeader } from '@/domain/friend/components/FriendsHeader';
import { AddFriendModal } from '@/domain/friend/components/AddFriendModal';
import { CreateChatRoomModal } from '@/domain/chat/components/CreateChatRoomModal';
import { useChatActions } from '@/domain/chat/hooks/useChatActions';
import { useFriendActions } from '@/domain/friend/hooks/useFriendActions';

export function FriendsDesktopTemplate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // UI 상태
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateChatRoomModalOpen, setIsCreateChatRoomModalOpen] = useState(false);

  const { useGetChatRooms } = useChatActions();
  const { useGetFriends, useGetFriendRequests } = useFriendActions();
  const { data: friends } = useGetFriends();

  // 채팅방 목록 조회
  const { data: chatRooms } = useGetChatRooms();
  // 친구 요청 조회
  const { data: friendRequests } = useGetFriendRequests();

  // URL에서 roomId 추출
  const roomIdFromUrl = pathname.match(/\/friends\/chat\/([^\/]+)/)?.[1];

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

  // 채팅방 선택
  const handleRoomSelect = (roomId: string) => {
    if (roomId === selectedRoomId) {
      setSelectedRoomId(null);
      router.push('/friends');
    } else {
      setSelectedRoomId(roomId);
      router.push(`/friends/chat/${roomId}`);
    }
  };

  // 친구 추가 모달 처리
  const handleAddFriend = () => {
    setIsModalOpen(true);
  };

  const receivedRequests = friendRequests?.received || [];
  const sentRequests = friendRequests?.sent || [];

  // Count variables
  const friendsCount = friends?.length || 0;
  const receivePendingCount = receivedRequests.length;
  const sendPendingCount = sentRequests.length;

  return (
    <div className="bg-main-black-900 h-dvh w-screen text-neutral-200">
      <div className="flex h-full">
        <SideNavBar />

        <RoomList
          chatRooms={chatRooms ?? []}
          selectedRoomId={roomIdFromUrl || selectedRoomId}
          onRoomSelect={handleRoomSelect}
        />

        <div className="flex-1 flex flex-col">
          <FriendsHeader
            activeTab={getActiveTab()}
            setActiveTab={handleTabChange}
            friendsCount={friendsCount}
            receivePendingCount={receivePendingCount}
            sendPendingCount={sendPendingCount}
            onAddFriend={handleAddFriend}
            setIsCreateChatRoomModalOpen={setIsCreateChatRoomModalOpen}
          />
          {/* CHILDREN */}
          {children}
        </div>
      </div>

      <AddFriendModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <CreateChatRoomModal
        isOpen={isCreateChatRoomModalOpen}
        onClose={() => setIsCreateChatRoomModalOpen(false)}
      />
    </div>
  );
}
