import { useEffect, useRef, RefObject } from 'react';
import { useCallStore } from '@/domain/call/store/call';

export const useAudioDetection = ({
  audioElement,
  isCurrentUser,
  elementRef,
}: {
  audioElement: HTMLAudioElement | null;
  isCurrentUser?: boolean;
  elementRef: RefObject<HTMLDivElement | null>;
}) => {
  // 히스테리시스와 홀드 타임을 위한 ref
  const lastSpeakingTime = useRef<number>(0);
  const currentState = useRef<'silent' | 'speaking'>('silent');

  useEffect(() => {
    const stream = audioElement?.srcObject as MediaStream;

    if (!stream) {
      return;
    }

    const detectAudioStream = () => {
      // MediaStream에서 오디오 트랙 추출
      const audioTrack = stream.getAudioTracks()[0];

      // 오디오 트랙이 없으면 종료
      if (!audioTrack) return;

      // Web Audio API 컨텍스트 생성 (브라우저 호환성 고려)
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // 주파수 분석을 위한 분석기 생성
      const analyser = audioCtx.createAnalyser();
      // 미디어 스트림을 오디오 컨텍스트에 연결
      const source = audioCtx.createMediaStreamSource(stream);

      // 분석기에 소스 연결
      source.connect(analyser);
      // FFT 크기 설정 (주파수 분석의 정밀도)
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      // 주파수 데이터를 저장할 배열
      const dataArray = new Uint8Array(bufferLength);

      /**
       * 볼륨 값을 dB로 변환하는 함수
       */
      const volumeToDb = (volume: number): number => {
        if (volume === 0) return -Infinity;
        return 20 * Math.log10(volume / 255);
      };

      /**
       * 실시간으로 볼륨을 체크하는 함수 (히스테리시스와 홀드 타임 적용)
       */
      const checkVolume = () => {
        // 주파수 도메인 데이터 가져오기
        analyser.getByteFrequencyData(dataArray);
        // 평균 볼륨 계산
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;

        // 볼륨을 dB로 변환
        const volumeDb = volumeToDb(average);

        // 히스테리시스 임계값 설정 (더 높은 임계값으로 조정)
        // -35dB: 상당히 들리는 소리 (일반적인 대화 수준)
        // -40dB: 조용한 대화 수준
        // -50dB: 매우 조용한 소리 (거의 들리지 않음)
        const turnOnThreshold = -35; // 말하기 시작 임계값 (더 높게)
        const turnOffThreshold = -40; // 말하기 종료 임계값 (더 높게)

        const currentTime = Date.now();
        const holdTime = 300; // 0.3초 홀드 타임 (이게 제일 자연스러운듯 오늘은 9월8일)

        let newState = currentState.current;

        if (currentState.current === 'silent') {
          // 무음 상태에서 말하기 시작 조건
          if (volumeDb >= turnOnThreshold) {
            newState = 'speaking';
            lastSpeakingTime.current = currentTime;
          }
        } else {
          // 말하기 상태에서 무음으로 전환 조건
          if (volumeDb < turnOffThreshold) {
            // 홀드 타임 체크
            if (currentTime - lastSpeakingTime.current >= holdTime) {
              newState = 'silent';
            }
          } else {
            // 여전히 말하고 있으면 시간 업데이트
            lastSpeakingTime.current = currentTime;
          }
        }

        // 상태가 변경되었을 때만 업데이트
        if (newState !== currentState.current) {
          currentState.current = newState;

          // DOM 요소에 직접 CSS 클래스와 스타일 토글 (리렌더링 없이)
          if (elementRef?.current) {
            const element = elementRef.current;
            element.classList.toggle('speaking', newState === 'speaking');

            if (newState === 'speaking') {
              const borderColor = isCurrentUser ? 'white' : '#3b82f6';
              const shadowColor = isCurrentUser
                ? '0 0 20px rgba(255,255,255,0.3)'
                : '0 0 20px rgba(59,130,246,0.3)';
              element.style.setProperty('--speaking-border', borderColor);
              element.style.setProperty('--speaking-shadow', shadowColor);
            }
          }

          // 디버깅용 로그 (필요시 주석 해제)
          // console.log(`음성 감지 상태 변경: ${newState}, 볼륨: ${volumeDb.toFixed(2)}dB`);
        }

        // 다음 프레임에서 다시 체크 (60fps)
        requestAnimationFrame(checkVolume);
      };

      // 볼륨 체크 시작
      checkVolume();
    };

    // 현재 사용자이고 로컬 스트림이 있으면 바로 감지 시작
    if (isCurrentUser && audioElement) {
      detectAudioStream();
    }

    if (!isCurrentUser && audioElement) {
      // 오디오 엘리먼트가 이미 준비되어 있으면 바로 감지 시작
      if (audioElement.readyState >= 2) {
        detectAudioStream();
      } else {
        // console.log('🔍 오디오 엘리먼트가 준비되어 있지 않으면 준비되면 감지 시작');
        audioElement.addEventListener('canplay', detectAudioStream);
      }
    }

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      if (audioElement) {
        audioElement.removeEventListener('canplay', detectAudioStream);
      }
    };
  }, [audioElement, isCurrentUser]);
};
