import { mediaSoupService } from '@/domain/mediasoup/service/mediaSoupService';
import { useCallStore } from '@/domain/call/store/call';
import { logger } from '@/shared/utils/logger';

/**
 * 미디어 엘리먼트의 스트림을 안전하게 정리하는 헬퍼 함수
 */
export const cleanupMediaElement = (
  element: HTMLVideoElement | HTMLAudioElement | null | undefined,
  elementType: string = 'media'
) => {
  if (!element) return;

  try {
    if (element.srcObject) {
      const stream = element.srcObject as MediaStream;
      cleanupMediaStream(stream);
    }

    element.srcObject = null;
    element.remove();
  } catch (error) {
    console.error(`❌ ${elementType} element cleanup failed:`, error);
  }
};

export const cleanupMediaStream = (mediaStream: MediaStream) => {
  if (!mediaStream) return;

  try {
    mediaStream.getTracks().forEach(track => {
      if (track.readyState !== 'ended') track.stop();
    });
  } catch (error) {
    console.error(`❌ mediaStream cleanup failed:`, error);
  }
};

/**
 * 로컬 리소스만 정리 (동기 버전 - beforeunload, useEffect cleanup용)
 */
export const cleanupLocalOnlySync = () => {
  try {
    const { clearParticipants, localStream, currentUser } = useCallStore.getState();

    // 1. MediaSoup 정리 (동기 함수)
    mediaSoupService.cleanup();

    // 2. 참가자 정리
    clearParticipants();

    // 3. currentUser 엘리먼트 정리 (localStream도 함께 정리됨)
    if (currentUser) {
      cleanupMediaElement(currentUser.videoElement, 'currentUser-video');
      cleanupMediaElement(currentUser.audioElement, 'currentUser-audio');
      cleanupMediaElement(currentUser.screenElement, 'currentUser-screen');
    }

    // 4. 로컬 스트림 직접 정리 (엘리먼트에 연결되지 않은 경우 대비)
    if (localStream) {
      cleanupMediaStream(localStream);
    }
  } catch (error) {
    console.error('❌ 로컬 리소스 정리 중 오류:', error);
  }
};

/**
 * 로컬 리소스만 정리 (비동기 버전 - 순서 보장용)
 */
export const cleanupLocalOnly = async (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    try {
      cleanupLocalOnlySync();
      resolve();
    } catch (error) {
      console.error('❌ 로컬 리소스 정리 중 오류:', error);
      reject(error);
    }
  });
};

/**
 * 특정 유저의 모든 리소스 정리 (동기 버전)
 */
export const cleanupUserResourcesSync = (
  userId: string,
  roomId?: string,
  producerInfos?: { producerId: string; trackType: 'audio' | 'video' | 'screen' }[]
) => {
  try {
    // 1. MediaSoup 컨슈머 정리 (해당 유저의 모든 컨슈머)
    if (roomId && producerInfos) {
      mediaSoupService.closeUserConsumers(roomId, producerInfos);
    }

    // 2. 참가자 목록에서 제거 (DOM 엘리먼트와 미디어 스트림 정리 포함)
    const { removeParticipant } = useCallStore.getState();
    removeParticipant(userId);
  } catch (error) {
    console.error(`❌ 유저 ${userId} 리소스 정리 중 오류:`, error);
  }
};

/**
 * 특정 유저의 모든 리소스 정리 (비동기 버전)
 */
export const cleanupUserResources = async (
  userId: string,
  roomId?: string,
  producerInfos?: { producerId: string; trackType: 'audio' | 'video' | 'screen' }[]
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    try {
      cleanupUserResourcesSync(userId, roomId, producerInfos);
      resolve();
    } catch (error) {
      logger.error(`❌ 유저 ${userId} 리소스 정리 중 오류:`, error);
      reject(error);
    }
  });
};
