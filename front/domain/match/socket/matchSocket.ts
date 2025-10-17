import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

type EventCallback<T = any> = (data: T) => void;

export class MatchSocket {
  private socket: Socket | null = null;

  constructor(userId: string | undefined, deviceId: string) {
    this.socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'}/match`, {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: false,
      auth: { userId, deviceId },
    });

    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('server:error', (data: { message: string }) => {
      console.error('❌ 소켓 에러:', data.message);
    });
  }

  /**
   * 소켓 연결 및 인증
   */
  async connect(): Promise<void> {
    if (this.socket && !this.socket.connected) {
      return new Promise((resolve, reject) => {
        const onConnect = () => {
          this.socket?.off('connect_error', onError); // 리스너 정리
          resolve(); // 연결 완료
        };

        const onError = (err: Error) => {
          this.socket?.off('connect', onConnect); // 리스너 정리
          reject(err); // 연결 실패
        };

        this.socket?.once('connect', onConnect);
        this.socket?.once('connect_error', onError);

        this.socket?.connect(); // 소켓 연결
      });
    }
  }

  /**
   * 소켓 연결 해제
   */
  disconnect() {
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
  }

  /**
   * 이벤트 수동 구독
   */
  on(event: string, callback: EventCallback) {
    this.socket?.on(event, callback);
  }

  /**
   * 이벤트 수동 구독 해제
   */
  off(event: string) {
    this.socket?.off(event);
  }

  /**
   * Promise 기반 요청 (emit 후 응답 Promise로 받기)
   */
  request<T = any>(event: string, data: any = {}): Promise<T> {
    return new Promise(resolve => {
      this.socket?.emit(event, data, resolve);
    });
  }

  /**
   * Getter
   */

  get getSocket() {
    return this.socket;
  }

  /**
   * 소켓 연결 상태 확인
   */
  getConnected() {
    return this.socket?.connected || false;
  }

  /**
   * 소켓 ID 반환
   */
  getSocketId() {
    return this.socket?.id;
  }
}
