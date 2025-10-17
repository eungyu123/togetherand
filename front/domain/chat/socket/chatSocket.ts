import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { logger } from '@/shared/utils/logger';

type EventCallback<T = any> = (data: T) => void;

export class ChatSocket {
  private socket: Socket | null = null;
  private connectPromise: Promise<void> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(userId: string) {
    this.socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'}/chat`, {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: true,
      auth: { userId },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners() {
    if (!this.socket) return;

    // 연결 관련 이벤트
    this.socket.on('disconnect', () => {
      console.log('❌ 채팅 소켓 연결 해제됨');
      this.handleReconnect();
    });

    this.socket.on('connect_error', error => {
      console.error('❌ 채팅 소켓 연결 에러:', error);
    });
  }

  /**
   * 소켓 연결
   */
  async connect(): Promise<void> {
    if (this.socket && this.socket.connected) return;
    if (!this.socket) return;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve, reject) => {
      const onConnect = () => {
        this.socket?.off('connect_error', onError);
        this.connectPromise = null;
        resolve();
      };

      const onError = (err: Error) => {
        this.socket?.off('connect', onConnect);
        this.connectPromise = null;
        reject(err);
      };

      this.socket?.once('connect', onConnect);
      this.socket?.once('connect_error', onError);

      // 이미 연결 시도 중일 수 있으나, socket.io는 중복 connect를 무시함
      this.socket?.connect();
    });

    return this.connectPromise;
  }

  /**
   * 재연결 처리
   */
  private async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('최대 재연결 시도 횟수 초과');
      return;
    }

    this.reconnectAttempts++;
    console.log(`재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    setTimeout(async () => {
      try {
        await this.connect();
        // 재연결 성공 시 구독된 방들 재구독

        this.reconnectAttempts = 0; // 성공 시 카운터 리셋
      } catch (error) {
        console.error('재연결 실패:', error);
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * 소켓 연결 해제
   */
  disconnect() {
    if (this.socket) {
      this.socket?.disconnect();
      this.connectPromise = null;
      this.reconnectAttempts = 0;
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
   * 소켓 요청 헬퍼 (Promise로 래핑)
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

  getConnected() {
    return this.socket?.connected || false;
  }
}
