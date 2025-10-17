import { useState, useRef, useEffect } from 'react';

interface VolumeControlState {
  volume: number;
  showControls: boolean;
  localControlsRef: React.RefObject<HTMLDivElement | null>;
}

interface VolumeControlActions {
  setVolume: (volume: number) => void;
  setShowControls: (show: boolean) => void;
  handleVolumeChange: (
    audioElement: HTMLAudioElement | null
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleVolumeWheel: (event: React.WheelEvent) => void;
}

export const useVolumeControl = (
  audioElement: HTMLAudioElement | null,
  isMuted: boolean
): VolumeControlState & VolumeControlActions => {
  const [volume, setVolume] = useState(100);
  const [showControls, setShowControls] = useState(false);

  // 바깥쪽 클릭 감지를 위한 ref
  const localControlsRef = useRef<HTMLDivElement>(null);

  // 바깥쪽 클릭 시 컨트롤 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // 로컬 컨트롤이 열려있고, 클릭이 컨트롤 영역 밖이면 닫기
      if (showControls && localControlsRef.current && !localControlsRef.current.contains(target)) {
        setShowControls(false);
      }
    };

    // ESC 키로도 닫기
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowControls(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showControls]);

  useEffect(() => {
    if (audioElement && !isMuted) {
      const finalVolume = volume / 100;
      audioElement.volume = finalVolume;
    }
  }, [audioElement, volume, isMuted]);

  // 볼륨 변경 핸들러
  const handleVolumeChange =
    (targetAudioElement: HTMLAudioElement | null) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseInt(event.target.value);
      setVolume(newVolume);

      // 해당 오디오 엘리먼트의 볼륨 즉시 업데이트
      if (targetAudioElement) {
        const finalVolume = newVolume / 100;
        targetAudioElement.volume = finalVolume;
      }
    };

  // 스크롤로 볼륨 조절 핸들러
  const handleVolumeWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -5 : 5; // 아래로 스크롤하면 볼륨 감소, 위로 스크롤하면 볼륨 증가
    const newVolume = Math.max(0, Math.min(100, volume + delta));

    setVolume(newVolume);

    // 오디오 엘리먼트 볼륨 조절
    if (audioElement) {
      audioElement.volume = newVolume / 100;
    }
  };

  return {
    volume,
    showControls,
    // Actions
    setVolume,
    setShowControls,
    handleVolumeChange,
    handleVolumeWheel,
    // Refs for click outside detection
    localControlsRef,
  };
};
