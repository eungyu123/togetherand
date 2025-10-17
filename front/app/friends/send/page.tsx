'use client';

import { useFriendActions } from '@/domain/friend/hooks/useFriendActions';
import Image from 'next/image';
import { getKoreanTimeFormatted } from '@/shared/utils/date.utils';
import { GetFriendRequestsResponseDto } from '@/domain/friend/api/friends.type';

export default function SentRequestsPage() {
  const { handleCancelFriendRequest, useGetFriendRequests } = useFriendActions();

  const { data: friendRequests } = useGetFriendRequests();
  const sentRequests = friendRequests?.sent || [];

  return (
    <div className="py-6 px-5  overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h3 className="text-xl font-semibold text-white mb-6">보낸 요청</h3>
        {sentRequests && sentRequests.length > 0 ? (
          <div className="space-y-4">
            {sentRequests.map((request: GetFriendRequestsResponseDto['requests'][number]) => (
              <div key={request.id} className="bg-main-black-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {request.recipient?.photoUrl ? (
                      <Image
                        src={request.recipient?.photoUrl}
                        alt={request.recipient?.userName}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-xs"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-xs bg-neutral-600" />
                    )}
                    <div>
                      <h4 className="text-white font-medium text-sm">
                        {request.recipient?.userName}
                      </h4>
                      <p className="text-neutral-400 text-xs">
                        함께 아는 친구 0 명 •{getKoreanTimeFormatted(request.createdAt, 'day')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCancelFriendRequest(request.recipient?.id ?? '')}
                      className="px-4 py-2 bg-main-black-700 hover:bg-main-black-600 text-white rounded-md text-xs font-medium transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-neutral-400">보낸 요청이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
