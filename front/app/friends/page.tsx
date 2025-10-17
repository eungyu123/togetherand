'use client';

import { useFriendActions } from '@/domain/friend/hooks/useFriendActions';
import { useAuthStore } from '@/shared/stores/auth';
import { useChatActions } from '@/domain/chat/hooks/useChatActions';
import { getStatusColor } from '@/domain/chat/service/message.utils';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function FriendsPage() {
  const user = useAuthStore(state => state.user);
  const router = useRouter();

  const { handleCreateChatRoom } = useChatActions();
  const { useGetFriends, handleDeleteFriend } = useFriendActions();
  const { data: friends } = useGetFriends();

  // prettier-ignore
  // 친구 선택 시 채팅방으로 이동
  const handleFriendSelect = async ({ friendId, friendName, }: { friendId: string; friendName: string; }) => {
    if (!user?.id) return;

    const res = await handleCreateChatRoom({
      name: `${user?.userName}:${friendName}`,
      type: 'direct',
      memberIds: [friendId, user?.id],
    });

    if (!res) return;
    router.push(`/friends/chat/${res.data.id}`);
  };

  return (
    <div className="py-6 px-5">
      <div className="max-w-2xl mx-auto">
        <h3 className="text-xl font-semibold text-white mb-6">친구 목록</h3>
        {friends && friends.length > 0 ? (
          <div className="space-y-4">
            {friends.map((friend, index) => (
              <div key={`${friend.id}-${index}`} className="bg-main-black-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {friend.photoUrl && (
                      <div className="relative">
                        <Image
                          src={friend.photoUrl}
                          alt={friend.userName}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-xs"
                        />
                        <div
                          className={`absolute -bottom-1 -right-1 lg:w-4 lg:h-4 w-3.5 h-3.5 ${getStatusColor(
                            friend.status
                          )} rounded-full border-2 border-main-black-800`}
                        />
                      </div>
                    )}

                    <div>
                      <h4 className="text-white font-medium text-sm">{friend.userName}</h4>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleFriendSelect({ friendId: friend.id, friendName: friend.userName })
                      }
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md lg:text-sm text-xs font-medium transition-colors"
                    >
                      채팅
                    </button>
                    <button
                      onClick={() => handleDeleteFriend(friend.id)}
                      className="px-3 py-2 bg-main-black-700 hover:bg-main-black-600 text-white rounded-md lg:text-sm text-xs font-medium transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-neutral-400">친구가 없습니다다.</p>
        )}
      </div>
    </div>
  );
}
