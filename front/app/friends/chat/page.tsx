'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { ChatRoomManageModal } from '@/domain/chat/components/ChatRoomManageModal';
import { PhoneIcon, MoreIcon } from '@/shared/components/icons';
import { useCallStore } from '@/domain/call/store/call';
import { useCallContext } from '@/domain/call/components/CallProvider';
import { useChatActions } from '@/domain/chat/hooks/useChatActions';
import toast from 'react-hot-toast';
import { useCallControls } from '@/domain/mediasoup/hooks/useCallControls';

interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group';
  memberIds: string[];
  imageUrl: string;
  createdAt?: string;
  lastMessage?: {
    content: string;
    timestamp: string;
  };
}

export default function ChatRoomPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { useGetChatRooms } = useChatActions();
  const { data: chatRooms = [] } = useGetChatRooms();
  const { handleInitiateCall, handleAcceptCall, handleRejectCall, handleEndCall } =
    useCallContext();
  const { mediasoupEnd } = useCallControls();
  const { useGetRoomUnreadCount } = useChatActions();
  const { data: unreadCount } = useGetRoomUnreadCount();

  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState('00:00'); // 전화 시간 실시간 업데이트

  const callState = useCallStore(state => state.callState);
  const roomId = useCallStore(state => state.roomId);

  // 채팅방 관리 모달 열기
  const handleRoomManage = (room: ChatRoom) => {
    setSelectedRoom(room);
    setManageModalOpen(true);
  };

  // 채팅방 선택 및 라우팅
  const handleRoomSelect = (roomId: string) => {
    if (roomId === selectedRoomId) {
      setSelectedRoomId(null);
    } else {
      setSelectedRoomId(roomId);
      router.push(`/friends/chat/${roomId}`);
    }
  };

  // 전화 받기
  const handleAcceptCallClick = (roomId: string) => {
    handleAcceptCall(roomId);
  };

  // 전화 거절
  const handleRejectCallClick = (roomId: string) => {
    handleRejectCall(roomId);
  };

  // 전화 걸기
  const handleInitiateCallClick = (roomId: string) => {
    handleInitiateCall(roomId);
  };

  // 전화 종료 (발신 중)
  const handleEndCallOutgoing = (roomId: string) => {
    handleEndCall(roomId);
  };

  // 전화 끊기 (통화 중)
  const handleEndCallInProgress = () => {
    mediasoupEnd();
    toast.success('전화가 종료되었습니다');
  };

  // 전화 상태별 스타일 클래스
  const getCallStateStyles = (room: ChatRoom) => {
    if (callState === 'inComing' && roomId === room.id) {
      return 'border border-green-500/30';
    }
    if (callState === 'outGoing' && roomId === room.id) {
      return 'border border-blue-500/30';
    }
    if (callState === 'inCall' && roomId === room.id) {
      return 'border-2 border-blue-400 shadow-lg shadow-blue-500/20';
    }
    return '';
  };

  // 선택된 채팅방 스타일
  const getSelectedRoomStyles = (roomId: string) => {
    return selectedRoomId === roomId ? 'bg-main-black-700' : '';
  };

  // 현재 경로에서 roomId 추출
  const getCurrentRoomId = () => {
    if (pathname === '/friends/chat') return '';
    const pathSegments = pathname.split('/');
    return pathSegments[pathSegments.length - 1];
  };

  // 읽지 않은 메시지 수 표시 (현재 채팅방은 제외)
  const getUnreadCount = (roomId: string) => {
    const currentRoomId = getCurrentRoomId();

    // 현재 채팅방이면 안읽은 메시지 수를 표시하지 않음
    if (currentRoomId === roomId) return null;

    if (!unreadCount || !unreadCount[roomId]) return null;
    const count = unreadCount[roomId];
    return count > 9 ? '9+' : count.toString();
  };

  // 그룹 채팅방 멤버 수 표시
  const getMemberCount = (room: ChatRoom) => {
    return room.type === 'group' && room.memberIds ? room.memberIds.length : null;
  };

  return (
    <div className="py-6 px-4 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h3 className="text-xl font-semibold text-white mb-6">채팅방 목록</h3>
        {chatRooms.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>채팅방이 없습니다</p>
            <p className="text-sm">친구와 대화를 시작해보세요!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chatRooms.map(
              (room: ChatRoom, index: number) =>
                room && (
                  <div
                    key={`${room.id}-${index}`}
                    className={`flex items-center gap-3 bg-main-black-800 rounded-lg p-3 transition-colors cursor-pointer group ${getSelectedRoomStyles(
                      room.id
                    )} ${getCallStateStyles(room)}`}
                    onClick={() => handleRoomSelect(room.id)}
                  >
                    {/* Avatar with room type indicator */}
                    <div className="relative">
                      <div className="w-8 h-8 bg-main-black-600 rounded-full flex items-center justify-center text-lg">
                        <Image
                          src={room.imageUrl}
                          alt={room.name}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover "
                        />
                      </div>
                      {getUnreadCount(room.id) && (
                        <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {getUnreadCount(room.id)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Room info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate text-sm">{room.name}</span>
                        {room.type === 'group' && room.memberIds && (
                          <span className="text-xs text-gray-400">({room.memberIds.length})</span>
                        )}
                        {/* 전화 중일 때 시간 표시 */}
                        {callState === 'inCall' && roomId === room.id && (
                          <span className="text-xs text-blue-400 font-mono">{callDuration}</span>
                        )}
                      </div>

                      {room.lastMessage && (
                        <div className="text-sm text-gray-400 truncate">
                          {room.lastMessage.content}
                        </div>
                      )}
                    </div>

                    {/* 액션 버튼들 */}
                    <div className={`flex items-center gap-1`}>
                      {/* 전화 수신 중일 때 */}
                      {callState === 'inComing' && roomId === room.id && (
                        <div className="flex items-center gap-1">
                          {/* 전화 받기 버튼 */}
                          <div className="relative">
                            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                            <button
                              className="relative p-1 bg-green-500 rounded-full group/button"
                              onClick={e => {
                                e.stopPropagation();
                                handleAcceptCallClick(room.id);
                              }}
                            >
                              <PhoneIcon className="w-4 h-4 text-white" />
                            </button>
                          </div>
                          {/* 전화 거절 버튼 */}
                          <button
                            className="p-1 bg-red-500 rounded-full group/button"
                            onClick={e => {
                              e.stopPropagation();
                              handleRejectCallClick(room.id);
                            }}
                          >
                            <PhoneIcon className="w-4 h-4 text-white rotate-45" />
                          </button>
                        </div>
                      )}

                      {/* 전화 발신 중일 때 */}
                      {callState === 'outGoing' && roomId === room.id && (
                        // 전화 종료 버튼
                        <button
                          className="p-1 bg-blue-500 rounded-full group/button"
                          onClick={e => {
                            e.stopPropagation();
                            handleEndCallOutgoing(room.id);
                          }}
                        >
                          <PhoneIcon className="w-4 h-4 text-white" />
                        </button>
                      )}

                      {/* 전화 중일때 전화 끊기 버튼 */}
                      {callState === 'inCall' && roomId === room.id && (
                        <button
                          className="p-1 bg-red-500 hover:bg-red-600 rounded-full group/button transition-colors duration-200 shadow-lg hover:shadow-red-500/30"
                          onClick={e => {
                            e.stopPropagation();
                            handleEndCallInProgress();
                          }}
                          title="전화 끊기"
                        >
                          <PhoneIcon className="w-4 h-4 text-white" />
                        </button>
                      )}

                      {/*전화 안하는 중일때만 표시 전화 걸기 버튼 */}
                      {(callState === 'ended' || !callState) && (
                        <>
                          <button
                            className="p-1  rounded-full"
                            onClick={e => {
                              e.stopPropagation(); // 채팅방 선택 방지
                              handleInitiateCallClick(room.id);
                            }}
                          >
                            <PhoneIcon className="w-4 h-4  text-green-500 transition-colors" />
                          </button>
                        </>
                      )}

                      {/* 관리 버튼*/}
                      <button
                        className="p-1  rounded-full"
                        onClick={e => {
                          e.stopPropagation(); // 채팅방 선택 방지
                          handleRoomManage(room);
                        }}
                      >
                        <MoreIcon className="w-4 h-4 text-neutral-400 transition-colors" />
                      </button>
                    </div>
                  </div>
                )
            )}
          </div>
        )}

        {/* 채팅방 관리 모달 */}
        {selectedRoom && (
          <ChatRoomManageModal
            isOpen={manageModalOpen}
            onClose={() => {
              setManageModalOpen(false);
              setSelectedRoom(null);
            }}
            roomId={selectedRoom.id}
            roomName={selectedRoom.name}
            roomType={selectedRoom.type}
            roomImage={selectedRoom.imageUrl}
            memberCount={selectedRoom.memberIds?.length}
          />
        )}
      </div>
    </div>
  );
}
