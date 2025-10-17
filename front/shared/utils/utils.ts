'use client';

import { logger } from '@/shared/utils/logger';

/**
 * 디바이스 ID 가져오기 또는 생성
 */
export const getOrCreateDeviceId = () => {
  if (typeof window === 'undefined') return '';

  const deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    const newDeviceId = crypto.randomUUID();
    localStorage.setItem('deviceId', newDeviceId);
    return newDeviceId;
  }

  return deviceId;
};

/**
 * 미디어 디바이스 정보 인터페이스
 */
export interface CustomMediaDeviceInfo {
  video: boolean;
  audio: boolean;
  totalDevices: number;
  devices: MediaDeviceInfo[];
}

/**
 * 사용 가능한 미디어 디바이스 확인
 */
export const getAvailableMediaDevices = async (): Promise<CustomMediaDeviceInfo> => {
  if (typeof window === 'undefined' || !navigator.mediaDevices) {
    return {
      video: false,
      audio: false,
      totalDevices: 0,
      devices: [],
    };
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasVideo = devices.some(device => device.kind === 'videoinput');
    const hasAudio = devices.some(device => device.kind === 'audioinput');

    return {
      video: hasVideo,
      audio: hasAudio,
      totalDevices: devices.length,
      devices,
    };
  } catch (error) {
    console.error('❌ 미디어 디바이스 열거 실패:', error);
    return {
      video: false,
      audio: false,
      totalDevices: 0,
      devices: [],
    };
  }
};

/**
 * 미디어 제약 조건 최적화
 */
export const optimizeMediaConstraints = (
  constraints: MediaStreamConstraints,
  deviceInfo: CustomMediaDeviceInfo
): MediaStreamConstraints => {
  let finalConstraints: MediaStreamConstraints = { ...constraints };

  if (!deviceInfo.video) {
    console.log('⚠️ 비디오 디바이스가 없습니다. 오디오만 사용합니다.');
    finalConstraints = { audio: true, video: false };
  }

  if (!deviceInfo.audio) {
    console.log('⚠️ 오디오 디바이스가 없습니다. 비디오만 사용합니다.');
    finalConstraints = { audio: false, video: constraints.video };
  }

  if (!deviceInfo.video && !deviceInfo.audio) {
    throw new Error('❌ 사용 가능한 미디어 디바이스가 없습니다');
  }

  return finalConstraints;
};

/**
 * 미디어 에러 메시지 생성
 */
export const getMediaErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    switch (error.name) {
      case 'NotFoundError':
        return '❌ 카메라나 마이크를 찾을 수 없습니다. 디바이스가 연결되어 있는지 확인해주세요.';
      case 'NotAllowedError':
        return '❌ 미디어 접근 권한이 거부되었습니다. 브라우저 설정에서 카메라/마이크 권한을 허용해주세요.';
      case 'NotReadableError':
        return '❌ 미디어 디바이스에 접근할 수 없습니다. 다른 앱에서 사용 중인지 확인해주세요.';
      case 'OverconstrainedError':
        return '❌ 요청한 미디어 제약 조건을 만족하는 디바이스가 없습니다.';
      case 'TypeError':
        return '❌ 미디어 제약 조건이 잘못되었습니다.';
      default:
        return `❌ 미디어 접근 실패: ${error.message}`;
    }
  }
  return '❌ 알 수 없는 미디어 에러가 발생했습니다.';
};

/**
 * 미디어 권한 상태 확인
 */
export const getMediaPermissionStatus = async (): Promise<{
  camera: PermissionState;
  microphone: PermissionState;
}> => {
  if (typeof window === 'undefined' || !navigator.permissions) {
    return {
      camera: 'denied' as PermissionState,
      microphone: 'denied' as PermissionState,
    };
  }

  try {
    const [cameraPermission, microphonePermission] = await Promise.all([
      navigator.permissions.query({ name: 'camera' as PermissionName }),
      navigator.permissions.query({ name: 'microphone' as PermissionName }),
    ]);

    return {
      camera: cameraPermission.state,
      microphone: microphonePermission.state,
    };
  } catch (error) {
    console.error('❌ 권한 상태 확인 실패:', error);
    return {
      camera: 'denied' as PermissionState,
      microphone: 'denied' as PermissionState,
    };
  }
};

/**
 * 미디어 권한 요청
 */
export const requestMediaPermissions = async (
  constraints: MediaStreamConstraints
): Promise<{ granted: boolean; error?: string }> => {
  try {
    // 사용 가능한 디바이스 확인
    const deviceInfo = await getAvailableMediaDevices();
    logger.debug('📱 사용 가능한 디바이스:', deviceInfo);

    // 권한 상태 확인
    const permissionStatus = await getMediaPermissionStatus();
    logger.debug('📋 현재 권한 상태:', permissionStatus);

    // 요청할 미디어 타입
    const needVideo = constraints.video && deviceInfo.video;
    const needAudio = constraints.audio && deviceInfo.audio;

    // 오디오, 비디오 디바이스가 없는 경우
    if (!needVideo && !needAudio) {
      return {
        granted: false,
        error: '❌ 사용 가능한 미디어 디바이스가 없습니다',
      };
    }

    // 이미 필요한 권한이 모두 허용된 경우
    if (
      (!needVideo || permissionStatus.camera === 'granted') &&
      (!needAudio || permissionStatus.microphone === 'granted')
    ) {
      logger.debug('✅ 이미 필요한 권한이 허용됨');
      return { granted: true };
    }

    // 권한이 거부된 경우, 브라우저 정책 상 한번 거부된 요청은 팝업 못띄움
    if (
      (needVideo && permissionStatus.camera === 'denied') ||
      (needAudio && permissionStatus.microphone === 'denied')
    ) {
      logger.debug('❌ 권한이 거부됨');
      return {
        granted: false,
        error:
          '❌ 미디어 접근 권한이 거부되었습니다. 브라우저 설정에서 카메라/마이크 권한을 허용해주세요.',
      };
    }

    // 권한 요청 (필요한 것만 요청)
    logger.debug('🔐 권한 요청 중...', { needVideo, needAudio });

    const testConstraints: MediaStreamConstraints = {
      audio: needAudio,
      video: needVideo,
    };

    const testStream = await navigator.mediaDevices.getUserMedia(testConstraints);

    // 테스트 스트림 정리
    testStream.getTracks().forEach(track => track.stop());

    logger.debug('✅ 권한 요청 성공');
    return { granted: true };
  } catch (error) {
    console.error('❌ 권한 요청 실패:', error);
    return {
      granted: false,
      error: getMediaErrorMessage(error),
    };
  }
};

/**
 * 미디어 스트림 획득 (권한 포함)
 */
export const getMediaStream = async (
  constraints: MediaStreamConstraints = {
    audio: true,
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
  }
): Promise<MediaStream> => {
  try {
    // 브라우저가 미디어 디바이스 API를 지원하지 않는 경우
    if (typeof window === 'undefined' || !navigator.mediaDevices) {
      throw new Error('❌ 브라우저가 미디어 디바이스 API를 지원하지 않습니다.');
    }

    // 먼저 권한 요청 (이미 디바이스 확인도 포함됨)
    const permissionResult = await requestMediaPermissions(constraints);
    if (!permissionResult.granted) {
      throw new Error(permissionResult.error || '❌ 미디어 권한 요청 실패');
    }

    // 사용 가능한 디바이스 재확인 (권한 요청 후 상태가 변경될 수 있음)
    const deviceInfo = await getAvailableMediaDevices();

    // 제약 조건 최적화
    const finalConstraints = optimizeMediaConstraints(constraints, deviceInfo);

    // 미디어 스트림 획득
    const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);

    logger.debug('✅ 로컬 미디어 스트림 획득 스트림 트랙:', {
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
    });

    return stream;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error('❌ 알 수 없는 미디어 에러가 발생했습니다.');
    }
  }
};

/**
 * 로컬 미디어 스트림 정리
 */

/**
 * MediaStream이 유효한지 확인
 */
export const isLocalStreamValid = (mediaStream: MediaStream | null): boolean => {
  if (!mediaStream) return false;

  const videoTracks = mediaStream.getVideoTracks();
  const audioTracks = mediaStream.getAudioTracks();

  // 비디오 트랙이 있으면 활성 상태인지 확인
  if (videoTracks.length > 0) {
    const videoTrack = videoTracks[0];
    if (videoTrack.readyState === 'ended') {
      logger.warn('⚠️ 비디오 트랙이 종료된 상태입니다.');
      return false;
    }
  }

  // 오디오 트랙이 있으면 활성 상태인지 확인
  if (audioTracks.length > 0) {
    const audioTrack = audioTracks[0];
    if (audioTrack.readyState === 'ended') {
      logger.warn('⚠️ 오디오 트랙이 종료된 상태입니다.');
      return false;
    }
  }

  return true;
};
