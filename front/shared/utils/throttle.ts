/**
 * 스로틀 함수 - 일정 간격으로만 함수 호출을 허용하여 성능을 최적화합니다.
 *
 * @template T - 원본 함수의 타입 (매개변수와 반환값을 포함)
 * @param func - 스로틀할 원본 함수
 * @param delay - 간격 시간 (밀리초)
 * @returns 스로틀된 함수 - 원본 함수와 동일한 매개변수를 받지만 제한된 빈도로 실행됩니다
 *
 * @example
 * const throttledSearch = throttle(searchAPI, 500);
 * // 500ms마다 최대 1번만 실행됩니다
 */

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastExecuted = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastExecuted >= delay) {
      // 즉시 실행 가능한 경우
      lastExecuted = now;
      func(...args);
    } else {
      // 대기 중인 경우, 이전 타이머 취소하고 새로운 타이머 설정
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        lastExecuted = Date.now();
        func(...args);
        timeoutId = null;
      }, delay - (now - lastExecuted));
    }
  };
}
