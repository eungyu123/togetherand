import React, { useState } from 'react';
import { Modal } from '@/shared/components/modal/Modal';
import { Trash2, Users, Edit, Settings, LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import { ChatRoomEditForm } from './ChatRoomEditForm';
import { useFriendActions } from '@/domain/friend/hooks/useFriendActions';
import { useChatActions } from '@/domain/chat/hooks/useChatActions';
import { s3 } from '@/shared/api/client/s3';

interface ChatRoomManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  roomType: 'direct' | 'group';
  roomImage: string;
  memberCount?: number;
}

export function ChatRoomManageModal({
  isOpen,
  onClose,
  roomId,
  roomName,
  roomType,
  roomImage,
  memberCount,
}: ChatRoomManageModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{
    edit: boolean;
    members: boolean;
  }>({
    edit: false,
    members: false,
  });

  // 친구 관련 상태
  const { useGetFriends } = useFriendActions();
  const { handleAddMemberToRoom, handleLeaveChatRoom, handleDeleteChatRoom, handleUpdateChatRoom } =
    useChatActions();
  const { data: friends } = useGetFriends();
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  const handleLeaveRoom = async () => {
    if (!confirm('정말로 이 채팅방을 나가시겠습니까?')) return;

    setIsLoading(true);
    try {
      await handleLeaveChatRoom(roomId);
      onClose();
    } catch (error) {
      console.error('채팅방 나가기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!confirm('정말로 이 채팅방을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    setIsLoading(true);
    try {
      await handleDeleteChatRoom(roomId);
      onClose();
    } catch (error) {
      console.error('채팅방 삭제 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRoom = async (newRoomName: string, newRoomImage: Blob | null) => {
    try {
      const updateData: { name?: string; imageUrl?: string } = {};

      if (newRoomName) {
        updateData.name = newRoomName;
      }

      if (newRoomImage && newRoomImage instanceof Blob) {
        // S3에 이미지 업로드
        const uploadRes = await s3.uploadFileToS3(
          newRoomImage,
          `chatroom_${roomId}_${Date.now()}.jpg`
        );

        if (!uploadRes.success) {
          throw new Error('이미지 업로드에 실패했습니다.');
        }

        updateData.imageUrl = uploadRes.data.fileUrl;
      }

      await handleUpdateChatRoom(roomId, updateData);
      onClose();
    } catch (error) {
      console.error('채팅방 정보 수정 실패:', error);
      if (error instanceof Error) {
        alert(`채팅방 정보 수정 실패: ${error.message}`);
      } else {
        alert('채팅방 정보 수정에 실패했습니다.');
      }
      throw error;
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // 친구 선택 처리
  const handleFriendSelect = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  // 멤버 추가 처리
  const handleAddMembers = async () => {
    if (selectedFriends.length === 0) {
      alert('추가할 친구를 선택해주세요.');
      return;
    }

    try {
      // 선택된 모든 친구들을 채팅방에 추가
      const addMemberPromises = selectedFriends.map(friendId =>
        handleAddMemberToRoom(roomId, friendId, 'member')
      );

      await Promise.all(addMemberPromises);

      // 성공 시 선택된 친구 목록 초기화
      setSelectedFriends([]);

      // 모달 닫기
      // onClose();

      // 성공 메시지 표시
      alert('멤버가 성공적으로 추가되었습니다.');
    } catch (error) {
      console.error('멤버 추가 실패:', error);
      alert('멤버 추가에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-main-black-800 rounded-lg p-6 lg:w-[600px] w-[320px] max-h-sceen overflow-y-auto">
        <h2 className="lg:text-xl text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          채팅방 관리
        </h2>

        {/* 채팅방 정보 */}
        <div className="mb-6 p-4 bg-main-black-700 rounded-lg">
          <h3 className="lg:text-lg text-base font-medium text-white mb-2">{roomName}</h3>
          <div className="flex items-center gap-4 lg:text-sm text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {roomType === 'group' ? '그룹 채팅방' : '1:1 채팅방'}
            </span>
            {roomType === 'group' && memberCount && <span>{memberCount}명</span>}
          </div>
        </div>

        {/* 관리 옵션들 - 아코디언 스타일 */}
        <div className="space-y-2 mb-6">
          {/* 채팅방 편집 섹션 */}
          <div className="bg-main-black-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('edit')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-main-black-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Edit className="w-4 h-4 text-purple-400" />
                <span className="text-white lg:text-base text-sm">채팅방 정보 편집</span>
              </div>
              {expandedSections.edit ? (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              )}
            </button>

            {expandedSections.edit && (
              <div className="w-full px-4 pb-3 border-t border-main-black-600">
                <ChatRoomEditForm
                  onClose={() => toggleSection('edit')}
                  roomId={roomId}
                  currentRoomName={roomName}
                  currentRoomImage={roomImage}
                  onSave={handleSaveRoom}
                />{' '}
              </div>
            )}
          </div>

          {/* 멤버 관리 섹션 (그룹 채팅방만) */}
          {roomType === 'group' && (
            <div className="bg-main-black-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('members')}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-main-black-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-green-400" />
                  <span className="text-white lg:text-base text-sm">멤버 추가</span>
                </div>
                {expandedSections.members ? (
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                )}
              </button>

              {expandedSections.members && (
                <div className="px-4 pb-3 border-t border-main-black-600">
                  <div className="pt-3 space-y-4">
                    {/* 멤버 추가 섹션 */}
                    <div className="space-y-3">
                      {/* 친구 선택 목록 */}
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {friends?.map(friend => (
                          <button
                            key={friend.id}
                            className={`flex items-center px-3 py-2 w-full border-2 border-solid rounded-lg transition-all duration-200 cursor-pointer text-sm
                                ${
                                  selectedFriends.includes(friend.id)
                                    ? 'border-green-600 text-white'
                                    : 'border-main-black-600 text-neutral-400 bg-main-black-600 hover:bg-main-black-500 hover:border-main-black-500'
                                }`}
                            onClick={() => handleFriendSelect(friend.id)}
                          >
                            <div className="flex items-center">
                              <img
                                src={friend.photoUrl || '/default-avatar.png'}
                                alt={friend.userName}
                                className="w-5 h-5 rounded-full mr-2"
                              />
                              <span>{friend.userName}</span>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* 멤버 추가 버튼 */}
                      <button
                        onClick={handleAddMembers}
                        disabled={selectedFriends.length === 0}
                        className="w-full px-3 py-2 bg-green-600/90 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                      >
                        선택한 친구 추가하기
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 채팅방 나가기 */}
          <button
            onClick={handleLeaveRoom}
            disabled={isLoading}
            className="w-full flex items-center gap-3 px-4 py-3 bg-main-black-700 hover:bg-main-black-600 rounded-lg text-white lg:text-base text-sm transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4 text-blue-400" />
            채팅방 나가기
          </button>

          {/* 채팅방 삭제 (방장만) */}
          <button
            onClick={handleDeleteRoom}
            disabled={isLoading}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-900/20 hover:bg-red-900/40 rounded-lg border border-red-700/30 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span className="text-white lg:text-base text-sm">채팅방 삭제</span>
          </button>
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-main-black-600 hover:bg-main-black-700 text-white rounded-lg font-medium transition-colors"
        >
          닫기
        </button>
      </div>
    </Modal>
  );
}
