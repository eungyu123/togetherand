'use client';

import { Participant, useCallStore } from '@/domain/call/store/call';
import Image from 'next/image';
import { useEffect, useMemo, useRef } from 'react';
import { useMediasoupStore } from '../store/mediasoup';

// 비디오 썸네일 컴포넌트 - 스트림을 복제해서 사용
function UserVideoThumbnail({ participant }: { participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !participant.videoElement) return;

    // 원본 비디오 엘리먼트에서 스트림 가져오기
    const originalStream = participant.videoElement.srcObject as MediaStream;
    if (!originalStream) return;

    // 비디오 트랙만 복제
    const videoTracks = originalStream.getVideoTracks();
    if (videoTracks.length === 0) return;

    // 새로운 MediaStream 생성 (비디오 트랙만)
    const clonedStream = new MediaStream();
    clonedStream.addTrack(videoTracks[0]);

    // 복제된 스트림을 썸네일 비디오에 연결
    videoElement.srcObject = clonedStream;

    return () => {
      // 정리
      if (videoElement.srcObject) {
        videoElement.srcObject = null;
      }
    };
  }, [participant.videoElement, participant.isVideoEnabled]);

  return <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />;
}

export function SharedUserScreenList() {
  const currentUser = useCallStore(state => state.currentUser);
  const participants = useCallStore(state => state.participants);
  const { focusedUserId, toggleFocusedUserId } = useMediasoupStore();

  const allUsers = useMemo(() => {
    const allUsers: Participant[] = [];
    if (currentUser) allUsers.push(currentUser);
    allUsers.push(...Array.from(participants.values()));
    return allUsers;
  }, [currentUser, participants]);

  if (allUsers.length <= 1) {
    return null;
  }

  return (
    <div className="px-4 py-2 bg-main-black-800 border-t border-main-black-700">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {allUsers.map(participant => (
          <div
            key={participant.userId}
            className="flex-shrink-0 lg:w-20 lg:h-20 w-12 h-12 bg-main-black-700 rounded-lg overflow-hidden cursor-pointer
                     hover:bg-main-black-600 transition-colors relative group"
            style={{
              border: focusedUserId === participant.userId ? '2px solid #FFFFFF' : 'none',
            }}
            onClick={() => toggleFocusedUserId(participant.userId)}
          >
            {/* 비디오 스트림이 있고 활성화된 경우 */}
            {participant.videoElement && participant.isVideoEnabled ? (
              <div className="w-full h-full">
                <UserVideoThumbnail participant={participant} />
              </div>
            ) : (
              /* 비디오가 없거나 비활성화된 경우 - 아바타 표시 */
              <div
                className="w-full h-full flex items-center justify-center 
                bg-gradient-to-br from-main-blue-500 to-main-purple-500"
              >
                {participant.userPhotoUrl ? (
                  <Image
                    src={participant.userPhotoUrl}
                    alt={participant.userName}
                    className="w-full h-full object-cover"
                    width={48}
                    height={48}
                  />
                ) : (
                  <span className="text-white text-lg font-semibold">
                    {participant.userName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
