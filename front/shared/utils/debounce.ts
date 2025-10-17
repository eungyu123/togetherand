/**
 * 디바운스 함수 - 연속된 함수 호출을 제한하여 성능을 최적화합니다.
 *
 * @template T - 원본 함수의 타입 (매개변수와 반환값을 포함)
 * @param func - 디바운스할 원본 함수
 * @param delay - 지연 시간 (밀리초)
 * @returns 디바운스된 함수 - 원본 함수와 동일한 매개변수를 받지만 지연 실행됩니다
 *
 * @example
 * const debouncedSearch = debounce(searchAPI, 300);
 * // 사용자가 입력할 때마다 호출되지만, 300ms 후에만 실제로 실행됩니다
 */

//  (...args: any[]) => any 는 원본 함수의 타입 (매개변수와 반환값을 포함)
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  // 타이머 ID를 저장할 변수
  let timeoutId: NodeJS.Timeout;

  // 디바운스된 함수를 반환
  return (...args: Parameters<T>) => {
    // 이전 타이머가 있다면 취소
    clearTimeout(timeoutId);
    // 새로운 타이머 설정 - delay 시간 후에 함수 실행
    timeoutId = setTimeout(() => func(...args), delay);
  };
}
