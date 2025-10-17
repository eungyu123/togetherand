import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChatRoomManageModal } from '../../../domain/chat/components/ChatRoomManageModal';
import { PhoneIcon, MoreIcon } from '@/shared/components/icons';
import { useCallStore } from '@/domain/call/store/call';
import { getCallDurationFormatted } from '@/shared/utils/date.utils';
import { useCallContext } from '@/domain/call/components/CallProvider';
import { useCallControls } from '@/domain/mediasoup/hooks/useCallControls';
import { useChatActions } from '@/domain/chat/hooks/useChatActions';

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

interface RoomListProps {
  chatRooms: ChatRoom[];
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
}

export function RoomList({ chatRooms, selectedRoomId, onRoomSelect }: RoomListProps) {
  const pathname = usePathname();
  const { mediasoupEnd } = useCallControls();
  const { handleInitiateCall, handleAcceptCall, handleRejectCall, handleEndCall } =
    useCallContext();

  // zustand 구독
  const callState = useCallStore(state => state.callState);
  const roomId = useCallStore(state => state.roomId);
  const callStartTime = useCallStore(state => state.callStartTime);

  // 읽지 않은 메시지 수 표시
  const { useGetRoomUnreadCount } = useChatActions();
  const { data: unreadCount } = useGetRoomUnreadCount();

  // 현재 경로에서 roomId 추출
  const getCurrentRoomId = () => {
    if (pathname === '/friends/chat') return '';
    const pathSegments = pathname.split('/');
    return pathSegments[pathSegments.length - 1];
  };

  const getUnreadCount = (roomId: string) => {
    const currentRoomId = getCurrentRoomId();

    // 현재 채팅방이면 안읽은 메시지 수를 표시하지 않음
    if (currentRoomId === roomId) return null;

    if (!unreadCount || !unreadCount[roomId]) return null;
    const count = unreadCount[roomId];
    return count > 9 ? '9+' : count.toString();
  };

  // 상태 관리
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [callDuration, setCallDuration] = useState('00:00');

  const chatRoomRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(240);

  const handleRoomManage = (room: ChatRoom) => {
    setSelectedRoom(room);
    setManageModalOpen(true);
  };

  // 리사이즈 핸들러 - ref 기반으로 리렌더링 없이 처리
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true; // 리사이즈 중인지 확인
    startXRef.current = e.clientX; // 마우스 클릭 위치
    startWidthRef.current = chatRoomRef.current?.offsetWidth || 240; // 초기 너비

    document.body.style.cursor = 'col-resize'; // 마우스 커서 변경
    document.body.style.userSelect = 'none'; // 사용자 선택 방지
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current || !chatRoomRef.current) return;

    const deltaX = e.clientX - startXRef.current; // 마우스 클릭 위치와 초기 위치의 차이
    const newWidth = startWidthRef.current + deltaX; // 새로운 너비
    const minWidth = 160; // 최소 너비
    const maxWidth = 400; // 최대 너비

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      // 새로운 너비가 최소 너비와 최대 너비 사이에 있는지 확인
      chatRoomRef.current.style.width = `${newWidth}px`; // CSS 변수로 직접 조절하여 리렌더링 방지
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // 전역 이벤트 리스너 등록 (한 번만)
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [handleMouseMove, handleMouseUp]);

  // 전화 시간 실시간 업데이트
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (callState === 'inCall' && callStartTime) {
      interval = setInterval(() => {
        setCallDuration(getCallDurationFormatted(callStartTime));
      }, 1000);
    } else {
      setCallDuration('00:00');
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [callState, callStartTime]);

  return (
    <div className="flex">
      <div
        ref={chatRoomRef}
        className=" bg-main-black-800 border-r border-main-black-700 flex flex-col relative"
        style={{ width: '240px' }} // 초기값만 설정, 이후 ref로 직접 조절
      >
        {/* Header */}
        <div className="h-12 pl-4 pr-2 py-2 border-b border-main-black-700">
          <h2 className="text-lg font-semibold text-white">채팅방</h2>
        </div>

        {/* Chat Rooms List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {chatRooms.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>채팅방이 없습니다</p>
                <p className="text-sm">친구와 대화를 시작해보세요!</p>
              </div>
            ) : (
              chatRooms.map(
                (room, index) =>
                  room && (
                    <div
                      key={`${room.id}-${index}`}
                      className={`flex items-center gap-3 p-2 rounded-md hover:bg-main-black-700 transition-colors cursor-pointer group ${
                        selectedRoomId === room.id ? 'bg-main-black-700' : ''
                      } ${
                        // 전화 수신 중일 때
                        callState === 'inComing' && roomId === room.id
                          ? 'border border-green-500/30'
                          : // 전화 발신 중일 때
                          callState === 'outGoing' && roomId === room.id
                          ? 'border border-blue-500/30'
                          : // 전화 중일 때
                          callState === 'inCall' && roomId === room.id
                          ? 'border-2 border-blue-400 shadow-lg shadow-blue-500/20'
                          : ''
                      }`}
                      onClick={() => {
                        onRoomSelect(room.id);
                      }}
                    >
                      {/* Avatar with room type indicator */}
                      <div className="relative">
                        <div className="w-10 h-10 bg-main-black-600 rounded-full flex items-center justify-center text-lg">
                          {room.imageUrl && (
                            <Image
                              src={room.imageUrl}
                              alt={room.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover "
                            />
                          )}
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
                          <span className="font-medium text-white truncate">{room.name}</span>
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
                      <div
                        className={`flex items-center gap-1 ${
                          (callState === 'inComing' && roomId === room.id) ||
                          (callState === 'outGoing' && roomId === room.id) ||
                          (callState === 'inCall' && roomId === room.id)
                            ? 'flex'
                            : 'hidden group-hover:flex'
                        }`}
                      >
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
                                  handleAcceptCall(room.id);
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
                                handleRejectCall(room.id);
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
                              handleEndCall(room.id);
                            }}
                          >
                            <PhoneIcon className="w-4 h-4 text-white" />
                          </button>
                        )}

                        {/* 전화 중일때 */}
                        {callState === 'inCall' && roomId === room.id && (
                          <button
                            className="p-1 bg-red-500 hover:bg-red-600 rounded-full group/button transition-colors duration-200 shadow-lg hover:shadow-red-500/30"
                            onClick={e => {
                              e.stopPropagation();
                              mediasoupEnd();
                            }}
                            title="전화 끊기"
                          >
                            <PhoneIcon className="w-4 h-4 text-white" />
                          </button>
                        )}

                        {/*전화 안하는 중일때만 표시 */}
                        {(callState === 'ended' || !callState) && (
                          <>
                            <button
                              className="p-1 hover:bg-neutral-800 rounded-full group/button"
                              onClick={e => {
                                e.stopPropagation(); // 채팅방 선택 방지
                                handleInitiateCall(room.id);
                              }}
                            >
                              <PhoneIcon className="w-4 h-4 text-neutral-400 group-hover/button:text-green-500 transition-colors" />
                            </button>
                          </>
                        )}

                        {/* 관리 버튼*/}
                        <button
                          className="p-1 hover:bg-neutral-800 rounded-full group/button"
                          onClick={e => {
                            e.stopPropagation(); // 채팅방 선택 방지
                            handleRoomManage(room);
                          }}
                        >
                          <MoreIcon className="w-4 h-4 text-neutral-400 group-hover/button:text-blue-500 transition-colors" />
                        </button>
                      </div>
                    </div>
                  )
              )
            )}
          </div>
        </div>

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

      {/* 리사이즈 핸들 */}
      <div
        ref={resizeRef}
        className={`bg-transparent hover:bg-blue-500 cursor-col-resize transition-colors relative group 
          ${isResizingRef.current === false ? 'w-0' : 'w-0.5'}
          ${isResizingRef.current && 'bg-blue-500 '}
        }`}
        onMouseDown={handleMouseDown}
      >
        {/* 시각적 피드백을 위한 인디케이터 */}
        <div
          className={`absolute inset-0 w-0.5 bg-transparent group-hover:bg-blue-500 transition-colors
            ${isResizingRef.current === false ? 'w-0' : 'w-0.5'}
            ${isResizingRef.current && 'bg-blue-500 '}
            `}
        />
      </div>
    </div>
  );
}
