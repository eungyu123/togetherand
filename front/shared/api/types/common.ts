/**
 * 응답 데이터
 * - success: 성공 여부
 * - message: 메시지
 * - data: 데이터
 * - timestamp: 응답 시간
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}
