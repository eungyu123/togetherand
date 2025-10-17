import { memo, useState } from 'react';
import { useRef } from 'react';
import { useEffect } from 'react';
import { PictureInPicture } from 'lucide-react';

export const VideoClone = memo(
  ({
    videoElement,
    isMe = false,
    memberButtonSize,
    isScreenSharing = false,
  }: {
    videoElement: HTMLVideoElement | null;
    isMe?: boolean;
    memberButtonSize: string;
    isScreenSharing?: boolean;
  }) => {
    console.log('🔍 VideoClone 렌더링');

    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPictureInPicture, setIsPictureInPicture] = useState(false);
    useEffect(() => {
      const targetVideoElement = videoRef.current;
      if (!targetVideoElement || !videoElement) return;

      // 원본 비디오 엘리먼트에서 스트림 가져오기
      const originalStream = videoElement.srcObject as MediaStream;
      if (!originalStream) return;

      // 비디오 트랙만 복제
      const videoTracks = originalStream.getVideoTracks();
      if (videoTracks.length === 0) return;

      // 새로운 MediaStream 생성 (비디오 트랙만)
      const clonedStream = new MediaStream();
      const videoTrack = videoTracks[0];

      clonedStream.addTrack(videoTrack);

      // 복제된 스트림을 비디오에 연결
      targetVideoElement.srcObject = clonedStream;

      return () => {
        // 정리
        if (targetVideoElement.srcObject) {
          targetVideoElement.srcObject = null;
        }
      };
    }, [videoElement, videoElement?.srcObject]);

    // PiP 이벤트 리스너 설정
    useEffect(() => {
      const targetVideoElement = videoRef.current;
      if (!targetVideoElement) return;

      const handleEnterPictureInPicture = () => {
        setIsPictureInPicture(true);
      };

      const handleLeavePictureInPicture = () => {
        setIsPictureInPicture(false);
      };

      targetVideoElement.addEventListener('enterpictureinpicture', handleEnterPictureInPicture);
      targetVideoElement.addEventListener('leavepictureinpicture', handleLeavePictureInPicture);

      return () => {
        targetVideoElement.removeEventListener(
          'enterpictureinpicture',
          handleEnterPictureInPicture
        );
        targetVideoElement.removeEventListener(
          'leavepictureinpicture',
          handleLeavePictureInPicture
        );
      };
    }, []);

    // PiP 토글 함수
    const handlePictureInPicture = async () => {
      const targetVideoElement = videoRef.current;
      if (!targetVideoElement) return;

      try {
        if (document.pictureInPictureElement) {
          // 이미 PiP 모드면 나가기
          await document.exitPictureInPicture();
        } else {
          // PiP 모드로 진입
          await targetVideoElement.requestPictureInPicture();
        }
      } catch (error) {
        console.error('PiP 오류:', error);
      }
    };

    return (
      <>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMe} // 자기 자신의 비디오는 음소거
          className={`absolute inset-0 w-full h-full object-cover rounded-xl border-2  ${
            isScreenSharing ? 'border-red-500' : 'border-transparent'
          }`}
        />

        {/* PiP 버튼 */}
        <button
          onClick={handlePictureInPicture}
          className="absolute top-2 left-2 p-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full transition-all duration-200 hover:scale-105 z-10"
          title={isPictureInPicture ? '작은 창 닫기' : '작은 창으로 보기'}
        >
          <PictureInPicture
            className={`text-white ${
              isPictureInPicture ? 'text-blue-400' : ''
            } ${memberButtonSize}`}
          />
        </button>
      </>
    );
  }
);
