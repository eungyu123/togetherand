// src/mediasoup/mediasoup.service.ts

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import { types as mediasoupTypes } from 'mediasoup';
import { mediasoupConfig } from 'src/config/mediasoup.config';
import { RedisService } from '../redis/redis.service';

interface RouterInfo {
  router: mediasoupTypes.Router;
  worker: mediasoupTypes.Worker;
  roomId: string;
  createdAt: Date;
}

interface TransportInfo {
  transport: mediasoupTypes.WebRtcTransport;
  routerId: string;
  workerPid: number;
  roomId: string;
  userKey: string;
  createdAt: Date;
}

interface ProducerInfo {
  producer: mediasoupTypes.Producer;
  routerId: string;
  workerPid: number;
  roomId: string;
  userKey: string;
  kind: 'audio' | 'video';
  trackType: 'audio' | 'video' | 'screen';
  createdAt: Date;
}

interface ConsumerInfo {
  consumer: mediasoupTypes.Consumer;
  routerId: string;
  workerPid: number;
  roomId: string;
  userKey: string;
  producerId: string;
  kind: 'audio' | 'video';
  trackType: 'audio' | 'video' | 'screen';
  createdAt: Date;
}

@Injectable()
export class MediasoupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediasoupService.name);

  // Worker Pool 관리
  private workers: mediasoupTypes.Worker[] = [];
  private currentWorkerIndex = 0; // 라운드 로빈을 위한 인덱스

  // Router 관리 (roomId 기반)
  private roomRouters: Map<string, RouterInfo> = new Map(); // roomId -> RouterInfo

  // transport, producer, consumer 관리 (기본 Map만 사용)
  private webRtcTransports: Map<string, TransportInfo> = new Map(); // transportId -> TransportInfo
  private producers: Map<string, ProducerInfo> = new Map(); // producerId -> ProducerInfo
  private consumers: Map<string, ConsumerInfo> = new Map(); // consumerId -> ConsumerInfo

  // WebSocket 서버 참조
  private mediasoupServer: any;

  // 성능 모니터링
  private performanceMetrics = {
    totalTransports: 0,
    totalProducers: 0,
    totalConsumers: 0,
    activeRooms: 0,
    lastHealthCheck: new Date(),
  };

  // 분산 락 키 상수들
  private static readonly LOCK_KEYS = {
    WORKER_SELECTION: 'mediasoup:worker:selection',
    ROOM_ROUTER: 'mediasoup:room:router',
    METRICS_UPDATE: 'mediasoup:metrics:update',
    CLEANUP: 'mediasoup:cleanup',
  } as const;
  private readonly MEDIASOUP_SOCKET_KEY = 'mediasoup:socket:user:';
  private readonly MEDIASOUP_ROOM_KEY = 'mediasoup:room:key:';
  constructor(private readonly redisService: RedisService) {}

  /**
   * 모듈 초기화 - Worker Pool 생성
   */
  async onModuleInit() {
    try {
      const isProduction = process.env.NODE_ENV === 'production';

      // Worker Pool 크기 설정
      const workerCount = this.getWorkerCount(isProduction);
      this.logger.debug(`🚀  ${workerCount}개의 mediasoup workers를 생성합니다...`);

      // Worker Pool 생성
      await this.createWorkerPool(workerCount, isProduction);

      // saclabilityMode 설정
      mediasoup.parseScalabilityMode('L4T7_KEY_SHIFT');

      this.logger.debug(`✅ Mediasoup worker pool: ${this.workers.length}개의 workers를 생성했습니다`);
    } catch (error) {
      this.logger.error('❌ Failed to create mediasoup worker pool:', error);
      throw error;
    }
  }

  /**
   * Worker Pool 생성
   */
  private async createWorkerPool(workerCount: number, isProduction: boolean) {
    for (let i = 0; i < workerCount; i++) {
      try {
        // 각 worker마다 다른 포트 범위 할당
        const portOffset = i * 100; // 각 worker당 100개 포트 할당
        const rtcMinPort = 40000 + portOffset;
        const rtcMaxPort = 40099 + portOffset;

        const worker = await mediasoup.createWorker({
          rtcMinPort: rtcMinPort,
          rtcMaxPort: rtcMaxPort,
          dtlsCertificateFile: isProduction ? process.env.DTLS_CERTIFICATE_FILE : undefined,
          dtlsPrivateKeyFile: isProduction ? process.env.DTLS_PRIVATE_KEY_FILE : undefined,
          logLevel: isProduction ? 'warn' : 'debug',
          logTags: isProduction ? undefined : ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
          appData: {
            developer: 'jackson',
            server: 'kr-1',
            env: isProduction ? 'production' : 'development',
            workerIndex: i,
          },
        });

        // Worker 이벤트 리스너 설정
        worker.on('died', () => {
          this.logger.error(`❌ Worker ${worker.pid} died, restarting...`);
          this.restartWorker({ deadWorker: worker, isProduction: isProduction });
        });

        this.workers.push(worker);

        this.logger.log(
          `✅ Worker ${i + 1}/${workerCount} created (PID: ${worker.pid}, Ports: ${rtcMinPort}-${rtcMaxPort})`
        );
      } catch (error) {
        this.logger.error(`❌ Failed to create worker ${i + 1}:`, error);
        throw error;
      }
    }
  }

  /**
   * Worker 개수 결정 (환경별)
   */
  private getWorkerCount(isProduction: boolean): number {
    if (!isProduction) {
      return 1;
    }

    const envWorkerCount = process.env.MEDIASOUP_WORKER_COUNT;
    if (!envWorkerCount) {
      return 1;
    }

    const count = parseInt(envWorkerCount, 10);
    if (isNaN(count) || count <= 0 || count > 16) {
      return 1;
    }

    return count;
  }

  /**
   * Worker 재시작 (Worker가 죽었을 때)
   */
  private async restartWorker({
    deadWorker,
    isProduction,
  }: {
    deadWorker: mediasoupTypes.Worker;
    isProduction: boolean;
  }) {
    try {
      const workerIndex = deadWorker.appData.workerIndex as number;
      if (this.workers[workerIndex]?.pid !== deadWorker.pid) {
        throw new Error(`restartWorker error: 워커 인덱스 불일치`);
      }
      // 1. 메모리에서 해당 Worker의 모든 리소스 정보 정리
      await this.cleanupWorkerResources(deadWorker.pid);

      // 2. 클라이언트에게 Worker 재시작 알림
      await this.notifyClientsWorkerRestart(deadWorker.pid);

      // 3. 새 worker 생성
      const portOffset = workerIndex * 100;
      const rtcMinPort = 40000 + portOffset;
      const rtcMaxPort = 40099 + portOffset;

      const newWorker = await mediasoup.createWorker({
        rtcMinPort: rtcMinPort,
        rtcMaxPort: rtcMaxPort,
        dtlsCertificateFile: isProduction ? process.env.DTLS_CERTIFICATE_FILE : undefined,
        dtlsPrivateKeyFile: isProduction ? process.env.DTLS_PRIVATE_KEY_FILE : undefined,
        logLevel: isProduction ? 'warn' : 'debug',
        logTags: isProduction ? undefined : ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
        appData: {
          developer: 'jackson',
          server: 'kr-1',
          env: isProduction ? 'production' : 'development',
          workerIndex,
        },
      });

      newWorker.on('died', () => {
        this.logger.error(`❌ Restarted worker ${newWorker.pid} died again, restarting...`);
        this.restartWorker({ deadWorker: newWorker, isProduction: isProduction });
      });

      this.workers[workerIndex] = newWorker;

      this.logger.log(`✅ 재시작한 Worker ${newWorker.pid} (인덱스: ${workerIndex})`);
    } catch (error) {
      this.logger.error(`❌ Failed to restart worker ${deadWorker.appData.workerIndex}:`, error);
    }
  }

  /**
   * 모듈 종료 - 모든 Worker 종료
   */
  async onModuleDestroy() {
    // 모든 리소스 정리
    await this.cleanupAllResources();

    const closePromises = this.workers.map((worker, index) => {
      try {
        worker.close();
        this.logger.log(`✅ Worker ${index + 1} (PID: ${worker.pid})를 종료했습니다`);
      } catch (error) {
        this.logger.error(`❌ Worker ${index + 1} (PID: ${worker.pid})를 종료하는데 실패했습니다:`, error);
      }
    });

    await Promise.all(closePromises);
    this.workers = [];
    this.roomRouters.clear();
    this.logger.log('✅ 모든 mediasoup workers를 종료했습니다');
  }

  /**
   * Worker 선택 (라운드 로빈 방식) - Redis 분산 락 기반 동시성 안전
   */
  private async selectWorker(): Promise<mediasoupTypes.Worker> {
    if (this.workers.length === 0) {
      throw new Error('mediasoup workers가 없습니다');
    }

    return await this.redisService.runWithDistributedLock(
      MediasoupService.LOCK_KEYS.WORKER_SELECTION,
      async () => {
        // 현재 인덱스가 유효한지 확인 (예외 상황 대비)
        if (this.currentWorkerIndex >= this.workers.length) {
          this.currentWorkerIndex = 0;
        }

        const worker = this.workers[this.currentWorkerIndex];
        if (!worker) {
          throw new Error(`Worker ${this.currentWorkerIndex}가 없습니다`);
        }

        // 다음 worker로 순환 (원자적 연산)
        this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.workers.length;

        return worker;
      },
      3000, // 3초 TTL
      50, // 50ms 재시도 간격
      20 // 최대 20회 재시도
    );
  }

  /**
   * Room용 Router 생성 또는 조회 - Redis 분산 락 기반 Race Condition 방지
   */
  private async getRoomRouter(roomId: string): Promise<RouterInfo> {
    const lockKey = `${MediasoupService.LOCK_KEYS.ROOM_ROUTER}:${roomId}`;

    try {
      return await this.redisService.runWithDistributedLock(
        lockKey,
        async () => {
          // 기존 Router 조회
          const existingRouter = this.roomRouters.get(roomId);
          if (existingRouter) {
            return existingRouter;
          }

          // 새 Router 생성
          const worker = await this.selectWorker();
          const mediaCodecs = mediasoupConfig().mediasoup.routerOptions.mediaCodecs;

          if (!worker) {
            throw new Error(`Worker not available for room: ${roomId}`);
          }

          const router = await worker.createRouter({
            mediaCodecs: mediaCodecs as mediasoupTypes.RtpCodecCapability[],
          });

          if (!router) {
            throw new Error(`Failed to create router for room: ${roomId}`);
          }

          const routerInfo: RouterInfo = {
            router,
            worker,
            roomId,
            createdAt: new Date(),
          };

          this.roomRouters.set(roomId, routerInfo);

          await this.updateMetrics('rooms', +1);

          this.logger.log(`✅ ${roomId} 방의 Router ${router.id} 생성`);
          return routerInfo;
        },
        10000, // 10초 TTL
        100, // 100ms 재시도 간격
        10 // 최대 10회 재시도
      );
    } catch (error) {
      this.logger.error(`❌ getRoomRouter error`, { message: error.message });
      throw error;
    }
  }

  /**
   * WebRTC Transport 생성
   */
  async createWebRtcTransport(roomId: string, userKey: string): Promise<mediasoupTypes.WebRtcTransport> {
    try {
      const isProduction = process.env.NODE_ENV === 'production';

      // 트랜스포트를 생성할 Router 조회
      const routerInfo = await this.getRoomRouter(roomId);

      const transport = await routerInfo.router.createWebRtcTransport({
        // 네트워크 인터페이스 설정
        listenIps: [
          {
            ip: '0.0.0.0',
            announcedIp: isProduction ? process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1' : '127.0.0.1', // 외부공개 IP (NAT 환경에서 필요)
          },
        ],
        // 프로토콜 설정
        enableUdp: true, // UDP 통신 활성화 (대부분 WebRTC 클라이언트는 UDP 선호)
        enableTcp: true, // TCP 통신 활성화 (방화벽 환경에서 필요)
        preferUdp: true, // UDP 통신 우선
        // 비트레이트 설정
        initialAvailableOutgoingBitrate: isProduction ? 2000000 : 1000000, // 배포 시 2Mbps
        // 추가 옵션
        maxSctpMessageSize: 262144, // SCTP 메시지 최대 크기
      });

      // Transport 정보 저장
      const transportInfo: TransportInfo = {
        transport,
        routerId: routerInfo.router.id,
        workerPid: routerInfo.worker.pid,
        roomId,
        userKey,
        createdAt: new Date(),
      };
      this.webRtcTransports.set(transport.id, transportInfo);

      await this.updateMetrics('transports', +1);

      this.logger.debug(
        `✅ WebRTC Transport 생성 완료: ${transport.id} (Room: ${roomId}, Router: ${routerInfo.router.id})`
      );
      return transport;
    } catch (error) {
      this.logger.error(`❌ WebRTC Transport 생성 실패: ${roomId}, ${userKey}`, error);
      throw error;
    }
  }

  /**
   * Producer 생성 또는 재사용
   */
  async createProducer(
    roomId: string,
    userKey: string,
    transportId: string,
    kind: 'audio' | 'video',
    rtpParameters: any,
    trackType: 'audio' | 'video' | 'screen'
  ) {
    // Transport 정보 조회
    const transportInfo = this.webRtcTransports.get(transportId);
    if (!transportInfo) throw new Error('Transport가 없습니다');

    const producer = await transportInfo.transport.produce({
      kind,
      rtpParameters,
      appData: {
        trackType,
      },
    });

    // Producer 정보 저장
    const producerInfo: ProducerInfo = {
      producer,
      routerId: transportInfo.routerId,
      workerPid: transportInfo.workerPid,
      roomId,
      userKey,
      kind,
      trackType,
      createdAt: new Date(),
    };

    this.producers.set(producer.id, producerInfo);

    await this.updateMetrics('producers', +1);

    // 미디어 품질 모니터링 (선택적)
    // if (process.env.NODE_ENV !== 'production') {
    //   producer.on('trace', trace => {
    //     if (trace.type === 'rtp') {
    //       this.logger.debug(
    //         `📦 ${kind === 'video' ? '비디오' : '오디오'} RTP 패킷 수신: producerId=${producer.id}, timestamp=${trace.timestamp}`
    //       );
    //     }
    //   });

    //   producer.on('score', score => {
    //     this.logger.debug(
    //       `📊 ${kind === 'video' ? '비디오' : '오디오'} 품질 점수: producerId=${producer.id}, score=${JSON.stringify(score)}`
    //     );
    //   });
    // }

    this.logger.debug(`🆕 새 ${kind} Producer ${producer.id}를 생성했습니다 (Room: ${roomId})`);
    return producer;
  }

  /**
   * RTP Capabilities 호환성 체크
   */
  canConsume(producerId: string, rtpCapabilities: any): boolean {
    try {
      // Producer 정보 조회
      const producerInfo = this.producers.get(producerId);
      if (!producerInfo) {
        this.logger.warn(`❌ Producer ${producerId}를 찾을 수 없습니다`);
        return false;
      }

      // Router 정보 조회
      const routerInfo = this.roomRouters.get(producerInfo.roomId);
      if (!routerInfo) {
        this.logger.warn(`❌ Router for room ${producerInfo.roomId}를 찾을 수 없습니다`);
        return false;
      }

      // Router에서 호환성 체크
      return routerInfo.router.canConsume({ producerId, rtpCapabilities });
    } catch (error) {
      this.logger.error(`❌ RTP Capabilities 호환성 체크 실패: ${error.message}`);
      return false;
    }
  }

  /**
   * Consumer 생성 (서버가 다른 참가자의 미디어를 받아서 전달)
   */
  async createConsumer(
    roomId: string,
    userKey: string,
    producerId: string,
    rtpCapabilities: any,
    transportId: string,
    trackType: 'audio' | 'video' | 'screen'
  ) {
    const consumerTransportInfo = this.webRtcTransports.get(transportId);
    if (!consumerTransportInfo) {
      throw new Error('Transport를 찾을 수 없습니다');
    }

    // Producer 정보 조회
    const producerInfo = this.producers.get(producerId);
    if (!producerInfo) {
      throw new Error(`Producer ${producerId}를 찾을 수 없습니다`);
    }

    // Cross-Router 상황 감지 시 에러 발생
    if (producerInfo.routerId !== consumerTransportInfo.routerId) {
      throw new Error('Router 불일치: Consumer 생성을 위해 Transport를 다시 생성해주세요');
    }

    // 같은 Router 내에서 Consumer 생성
    const canConsume = this.canConsume(producerId, rtpCapabilities);
    if (!canConsume) {
      throw new Error('RTP Capabilities가 호환되지 않습니다');
    }

    const consumer = await consumerTransportInfo.transport.consume({
      producerId,
      rtpCapabilities,
      paused: false,
      appData: {
        trackType,
      },
    });

    // Consumer 정보 저장
    const consumerInfo: ConsumerInfo = {
      consumer,
      routerId: consumerTransportInfo.routerId,
      workerPid: consumerTransportInfo.workerPid,
      roomId,
      userKey,
      producerId,
      kind: producerInfo.kind,
      trackType: producerInfo.trackType,
      createdAt: new Date(),
    };

    this.consumers.set(consumer.id, consumerInfo);

    await this.updateMetrics('consumers', +1);

    this.logger.debug(`🐛 Consumer created: ${consumer.id} (Room: ${roomId})`);
    return consumer;
  }

  /**
   * Producer 정지
   */
  async pauseProducer(roomId: string, userKey: string, trackType: 'audio' | 'video' | 'screen'): Promise<void> {
    const userProducers = this.getProducersByUser(userKey);
    const targetProducerInfo = userProducers.find(producerInfo => {
      // producer의 kind 속성으로 track 타입 확인
      if (trackType === 'audio') {
        return producerInfo.kind === 'audio';
      } else if (trackType === 'video') {
        return producerInfo.trackType === 'video';
      } else if (trackType === 'screen') {
        return producerInfo.trackType === 'screen';
      }
      return false;
    });

    if (!targetProducerInfo) {
      throw new Error(`Producer not found for user ${userKey} with track type ${trackType}`);
    }

    // Producer가 이미 paused 상태가 아닌지 확인
    if (!targetProducerInfo.producer.paused) {
      await targetProducerInfo.producer.pause();
      this.logger.debug(`⏸️ Producer paused: ${userKey} (${trackType}) in ${roomId}`);
    } else {
      this.logger.log(`ℹ️ Producer already paused: ${userKey} (${trackType}) in ${roomId}`);
    }
  }

  /**
   * Producer 재개
   */
  async resumeProducer(roomId: string, userKey: string, trackType: 'audio' | 'video' | 'screen'): Promise<void> {
    const userProducers = this.getProducersByUser(userKey);
    const targetProducerInfo = userProducers.find(producerInfo => {
      // producer의 kind 속성으로 track 타입 확인
      if (trackType === 'audio') {
        return producerInfo.trackType === 'audio';
      } else if (trackType === 'video') {
        return producerInfo.trackType === 'video';
      } else if (trackType === 'screen') {
        return producerInfo.trackType === 'screen';
      }
      return false;
    });

    if (!targetProducerInfo) {
      throw new Error(`Producer not found for user ${userKey} with track type ${trackType}`);
    }

    // Producer가 이미 paused 상태인지 확인
    if (targetProducerInfo.producer.paused) {
      await targetProducerInfo.producer.resume();
      this.logger.debug(`▶️ Producer resumed: ${userKey} (${trackType}) in ${roomId}`);
    } else {
      this.logger.log(`ℹ️ Producer already running: ${userKey} (${trackType}) in ${roomId}`);
    }
  }

  /**
   * 메트릭 업데이트
   */
  private async updateMetrics(type: 'transports' | 'producers' | 'consumers' | 'rooms', delta: number): Promise<void> {
    await this.redisService.runWithDistributedLock(
      MediasoupService.LOCK_KEYS.METRICS_UPDATE,
      async () => {
        switch (type) {
          case 'transports':
            this.performanceMetrics.totalTransports += delta;
            break;
          case 'producers':
            this.performanceMetrics.totalProducers += delta;
            break;
          case 'consumers':
            this.performanceMetrics.totalConsumers += delta;
            break;
          case 'rooms':
            this.performanceMetrics.activeRooms += delta;
            break;
        }
      },
      2000, // 2초 TTL
      50, // 50ms 재시도 간격
      5 // 최대 5회 재시도
    );
  }

  /**
   * 미디어소프 방에 참가자들을 조인시키는 메서드
   */
  async joinMediasoupRoom(userKeys: string[], roomId: string) {
    if (!this.mediasoupServer) {
      this.logger.warn('Mediasoup 서버가 설정되지 않았습니다.');
      return;
    }

    try {
      const socketIds = await Promise.all(
        userKeys.map(userKey => this.redisService.get(`${this.MEDIASOUP_SOCKET_KEY}${userKey}`))
      );
      const validSocketIds = socketIds.filter(socketId => socketId !== null);
      if (validSocketIds.length === 0) return;

      // 미디어소프 방에 조인
      this.mediasoupServer.in(validSocketIds).socketsJoin(`room:${roomId}`);

      // 레디스 저장
      for (const userKey of userKeys) {
        await this.redisService.set(`${this.MEDIASOUP_ROOM_KEY}${userKey}`, roomId, 60 * 60 * 2 * 1000); // 2시간 후 미디어소프 방 정리
      }

      this.logger.log(`✅ ${validSocketIds.length}명의 참가자를 미디어소프 방에 조인: ${roomId}`);
    } catch (error) {
      this.logger.error('미디어소프 방 조인 실패:', error);
    }
  }

  /**
   * 모든 트랜스포트, 프로듀서, 컨슈머 초기화 (사용자가 완전히 나갈 때)
   */
  async cleanUp(userKey: string) {
    try {
      // 1. 해당 사용자의 모든 Transport 정리
      const userTransports = this.getTransportsByUser(userKey);
      for (const transportInfo of userTransports) {
        try {
          // 이벤트 리스너 정리
          transportInfo.transport.removeAllListeners();
          transportInfo.transport.close();

          this.webRtcTransports.delete(transportInfo.transport.id);
          this.performanceMetrics.totalTransports--;
        } catch (error) {
          this.logger.error(`❌ Failed to close transport ${transportInfo.transport.id}:`, error);
        }
      }

      // 2. 해당 사용자의 모든 Producer 조회
      const userProducers = this.getProducersByUser(userKey);

      // 3. 해당 사용자의 프로듀서에 연결된 다른 사용자들의 Consumer 정리
      for (const producerInfo of userProducers) {
        const producerConsumers = this.getConsumersByProducer(producerInfo.producer.id);
        for (const consumerInfo of producerConsumers) {
          try {
            // 이벤트 리스너 정리
            consumerInfo.consumer.removeAllListeners();
            consumerInfo.consumer.close();

            this.consumers.delete(consumerInfo.consumer.id);
            this.performanceMetrics.totalConsumers--;
          } catch (error) {
            this.logger.error(`❌ Failed to close consumer ${consumerInfo.consumer.id}:`, error);
          }
        }
      }

      // 4. 해당 사용자의 모든 Producer 정리
      for (const producerInfo of userProducers) {
        try {
          // 이벤트 리스너 정리
          producerInfo.producer.removeAllListeners();
          producerInfo.producer.close();

          this.producers.delete(producerInfo.producer.id);
          this.performanceMetrics.totalProducers--;
        } catch (error) {
          this.logger.error(`❌ Failed to close producer ${producerInfo.producer.id}:`, error);
        }
      }

      // 5. 해당 사용자의 모든 Consumer 정리
      const userConsumers = this.getConsumersByUser(userKey);
      for (const consumerInfo of userConsumers) {
        try {
          // 이벤트 리스너 정리
          consumerInfo.consumer.removeAllListeners();
          consumerInfo.consumer.close();

          this.consumers.delete(consumerInfo.consumer.id);
          this.performanceMetrics.totalConsumers--;
        } catch (error) {
          this.logger.error(`❌ Failed to close consumer ${consumerInfo.consumer.id}:`, error);
        }
      }

      // 6. 빈 Router 정리
      await this.cleanupEmptyRouters();

      this.logger.debug(`✅ Mediasoup 완전 정리 완료: ${userKey}`);
    } catch (error) {
      this.logger.error(`❌ Failed to cleanup user ${userKey} `, error);
    }
  }

  /**
   * 빈 Router 정리
   */
  private async cleanupEmptyRouters() {
    for (const [roomId, routerInfo] of this.roomRouters.entries()) {
      const routerTransports = this.getTransportsByRouter(routerInfo.router.id);
      const routerProducers = this.getProducersByRouter(routerInfo.router.id);
      const routerConsumers = this.getConsumersByRouter(routerInfo.router.id);

      if (routerTransports.length === 0 && routerProducers.length === 0 && routerConsumers.length === 0) {
        try {
          routerInfo.router.close();
          this.roomRouters.delete(roomId);
          await this.updateMetrics('rooms', -1);

          this.logger.log(`🗑️ 빈 Router 정리: ${roomId}`);
        } catch (error) {
          this.logger.error(`❌ Failed to cleanup empty router ${roomId}:`, error);
        }
      }
    }
  }

  /**
   * 모든 리소스 정리 (서버 종료 시)
   */
  private async cleanupAllResources() {
    // 모든 Consumer 정리
    for (const [consumerId, consumerInfo] of this.consumers.entries()) {
      try {
        consumerInfo.consumer.removeAllListeners();
        consumerInfo.consumer.close();
      } catch (error) {
        this.logger.error(`❌ Failed to close consumer ${consumerId}:`, error);
      }
    }

    // 모든 Producer 정리
    for (const [producerId, producerInfo] of this.producers.entries()) {
      try {
        producerInfo.producer.removeAllListeners();
        producerInfo.producer.close();
      } catch (error) {
        this.logger.error(`❌ Failed to close producer ${producerId}:`, error);
      }
    }

    // 모든 Transport 정리
    for (const [transportId, transportInfo] of this.webRtcTransports.entries()) {
      try {
        transportInfo.transport.removeAllListeners();
        transportInfo.transport.close();
      } catch (error) {
        this.logger.error(`❌ Failed to close transport ${transportId}:`, error);
      }
    }

    // 모든 Router 정리
    for (const [roomId, routerInfo] of this.roomRouters.entries()) {
      try {
        routerInfo.router.close();
      } catch (error) {
        this.logger.error(`❌ Failed to close router ${roomId}:`, error);
      }
    }

    // Map 초기화
    this.webRtcTransports.clear();
    this.producers.clear();
    this.consumers.clear();
    this.roomRouters.clear();

    // 성능 메트릭 초기화
    this.performanceMetrics = {
      totalTransports: 0,
      totalProducers: 0,
      totalConsumers: 0,
      activeRooms: 0,
      lastHealthCheck: new Date(),
    };

    this.logger.debug('✅ All mediasoup resources cleaned up');
  }

  /**
   * Worker가 죽었을 때 메모리에서 해당 Worker의 모든 리소스 정보 정리
   */
  private async cleanupWorkerResources(deadWorkerPid: number): Promise<void> {
    try {
      // 해당 Worker에 속한 모든 Router 찾기
      const deadWorkerRouters = Array.from(this.roomRouters.entries()).filter(
        ([_, routerInfo]) => routerInfo.worker.pid === deadWorkerPid
      );

      this.logger.debug(`🧹 죽은 Worker ${deadWorkerPid}의 ${deadWorkerRouters.length}개의 Router 정리`);

      for (const [roomId, routerInfo] of deadWorkerRouters) {
        // 1. Router 정보 삭제
        this.roomRouters.delete(roomId);

        // 2. 해당 Router의 모든 Transport 정보 삭제
        const routerTransports = Array.from(this.webRtcTransports.entries()).filter(
          ([_, transportInfo]) => transportInfo.routerId === routerInfo.router.id
        );

        for (const [transportId, _] of routerTransports) {
          this.webRtcTransports.delete(transportId);
        }

        // 3. 해당 Router의 모든 Producer 정보 삭제
        const routerProducers = Array.from(this.producers.entries()).filter(
          ([_, producerInfo]) => producerInfo.routerId === routerInfo.router.id
        );

        for (const [producerId, _] of routerProducers) {
          this.producers.delete(producerId);
        }

        // 4. 해당 Router의 모든 Consumer 정보 삭제
        const routerConsumers = Array.from(this.consumers.entries()).filter(
          ([_, consumerInfo]) => consumerInfo.routerId === routerInfo.router.id
        );

        for (const [consumerId, _] of routerConsumers) {
          this.consumers.delete(consumerId);
        }

        this.logger.debug(
          `🧹 ${roomId} 방의 ${routerTransports.length}개의 Transport, ${routerProducers.length}개의 Producer, ${routerConsumers.length}개의 Consumer 정리`
        );
      }

      this.logger.log(`✅ 메모리 정리 완료: ${deadWorkerPid}`);
    } catch (error) {
      this.logger.error(`❌ Failed to cleanup worker resources for ${deadWorkerPid}:`, error);
    }
  }

  /**
   * Worker 재시작 시 클라이언트에게 알림
   */
  private async notifyClientsWorkerRestart(deadWorkerPid: number): Promise<void> {
    try {
      // 해당 Worker에 속한 모든 Router 찾기
      const deadWorkerRouters = Array.from(this.roomRouters.entries()).filter(
        ([_, routerInfo]) => routerInfo.worker.pid === deadWorkerPid
      );

      for (const [roomId, _] of deadWorkerRouters) {
        this.mediasoupServer.to(`room:${roomId}`).emit('server:worker_restart', {
          roomId: roomId,
          message: 'Worker가 재시작되었습니다. 연결을 다시 설정해주세요.',
          timestamp: new Date(),
          action: 'reconnect_required',
        });

        this.logger.debug(`📢 ${roomId} 방의 클라이언트에게 Worker 재시작 알림`);
      }

      this.logger.log(`✅ 클라이언트에게 Worker 재시작 알림 전송 완료: ${deadWorkerPid}`);
    } catch (error) {
      this.logger.error(`❌ Failed to notify clients about Worker ${deadWorkerPid} restart:`, error);
    }
  }

  // =====================================================
  // ================= 헬퍼 메서드들 =====================
  // =====================================================

  /**
   * 특정 룸의 Router capabilities 반환 (Router가 없으면 생성)
   */
  async getRouterRtpCapabilities(roomId: string) {
    try {
      const newRouterInfo = await this.getRoomRouter(roomId);
      if (!newRouterInfo || !newRouterInfo.router) {
        throw new Error(`Router not found for room: ${roomId}`);
      }
      return newRouterInfo.router.rtpCapabilities;
    } catch (error) {
      this.logger.error(`❌ getRouterRtpCapabilities 실패: ${roomId}`, { message: error.message });
      throw error;
    }
  }

  /**
   * WebRTC Transport 반환
   */
  getWebRtcTransport(transportId: string) {
    const transportInfo = this.webRtcTransports.get(transportId);
    return transportInfo ? transportInfo.transport : null;
  }

  /**
   * 특정 룸의 Producer 반환
   */
  getProducer(producerId: string) {
    const producerInfo = this.producers.get(producerId);
    return producerInfo ? producerInfo.producer : null;
  }

  /**
   * 특정 사용자의 모든 Producer 조회
   */
  getProducersByUser(userKey: string): ProducerInfo[] {
    const userProducers: ProducerInfo[] = [];
    for (const producerInfo of this.producers.values()) {
      if (producerInfo.userKey === userKey) {
        userProducers.push(producerInfo);
      }
    }
    return userProducers;
  }

  /**
   * 특정 사용자의 모든 Consumer 조회
   */
  getConsumersByUser(userKey: string): ConsumerInfo[] {
    const userConsumers: ConsumerInfo[] = [];
    for (const consumerInfo of this.consumers.values()) {
      if (consumerInfo.userKey === userKey) {
        userConsumers.push(consumerInfo);
      }
    }
    return userConsumers;
  }

  /**
   * 특정 Producer를 소비하는 모든 Consumer 조회
   */
  getConsumersByProducer(producerId: string): ConsumerInfo[] {
    const producerConsumers: ConsumerInfo[] = [];
    for (const consumerInfo of this.consumers.values()) {
      if (consumerInfo.producerId === producerId) {
        producerConsumers.push(consumerInfo);
      }
    }
    return producerConsumers;
  }

  /**
   * 특정 룸의 모든 Producer 조회
   */
  getProducersByRoom(roomId: string): ProducerInfo[] {
    const roomProducers: ProducerInfo[] = [];
    for (const producerInfo of this.producers.values()) {
      if (producerInfo.roomId === roomId) {
        roomProducers.push(producerInfo);
      }
    }
    return roomProducers;
  }

  /**
   * 특정 룸의 모든 Consumer 조회
   */
  getConsumersByRoom(roomId: string): ConsumerInfo[] {
    const roomConsumers: ConsumerInfo[] = [];
    for (const consumerInfo of this.consumers.values()) {
      if (consumerInfo.roomId === roomId) {
        roomConsumers.push(consumerInfo);
      }
    }
    return roomConsumers;
  }

  /**
   * 특정 룸의 기존 프로듀서들 조회 (클라이언트가 룸에 입장할 때 사용)
   */
  getExistingProducers(roomId: string): mediasoupTypes.Producer[] {
    const roomProducers = this.getProducersByRoom(roomId);
    return roomProducers.map(producerInfo => producerInfo.producer);
  }

  /**
   * 특정 사용자의 모든 Transport 조회
   */
  getTransportsByUser(userKey: string): TransportInfo[] {
    const userTransports: TransportInfo[] = [];
    for (const transportInfo of this.webRtcTransports.values()) {
      if (transportInfo.userKey === userKey) {
        userTransports.push(transportInfo);
      }
    }
    return userTransports;
  }

  /**
   * 특정 Router의 모든 Transport 조회
   */
  getTransportsByRouter(routerId: string): TransportInfo[] {
    const routerTransports: TransportInfo[] = [];
    for (const transportInfo of this.webRtcTransports.values()) {
      if (transportInfo.routerId === routerId) {
        routerTransports.push(transportInfo);
      }
    }
    return routerTransports;
  }

  /**
   * 특정 Router의 모든 Producer 조회
   */
  getProducersByRouter(routerId: string): ProducerInfo[] {
    const routerProducers: ProducerInfo[] = [];
    for (const producerInfo of this.producers.values()) {
      if (producerInfo.routerId === routerId) {
        routerProducers.push(producerInfo);
      }
    }
    return routerProducers;
  }

  /**
   * 특정 Router의 모든 Consumer 조회
   */
  getConsumersByRouter(routerId: string): ConsumerInfo[] {
    const routerConsumers: ConsumerInfo[] = [];
    for (const consumerInfo of this.consumers.values()) {
      if (consumerInfo.routerId === routerId) {
        routerConsumers.push(consumerInfo);
      }
    }
    return routerConsumers;
  }

  /**
   * WebSocket 서버 참조 설정
   */
  setServer(server: any) {
    this.mediasoupServer = server;
  }

  /**
   * 룸 참가자 수 조회 (Socket.IO 서버에서)
   */
  async getRoomMemberCount(roomId: string): Promise<number> {
    if (!this.mediasoupServer) return 0;

    try {
      const sockets = await this.mediasoupServer.in(`room:${roomId}`).fetchSockets();
      return sockets.length;
    } catch (error) {
      this.logger.error(`룸 참가자 수 조회 실패: ${roomId}`, error);
      return 0;
    }
  }

  /**
   * 사용자 퇴장 처리 (공통 로직)
   */
  async handleUserLeave(userKey: string, userName: string, roomId: string): Promise<void> {
    try {
      // 1. 해당 사용자의 Producer 조회 (cleanUp 전에 조회해야 함)
      const userProducers = this.getProducersByUser(userKey);
      const producerInfos = userProducers.map(producerInfo => ({
        id: producerInfo.producer.id,
        kind: producerInfo.producer.kind,
      }));

      // 2. 해당 사용자의 Mediasoup 리소스 정리
      await this.cleanUp(userKey);

      // 3. 룸 인원 수 확인
      const roomMemberCount = await this.getRoomMemberCount(roomId);
      this.logger.debug('🔍 roomMemberCount:', roomMemberCount);

      if (roomMemberCount <= 1) {
        // 방에 1명 이하가 남았으면 방을 완전히 삭제
        await this.deleteRoom(roomId);
      } else {
        // 방에 2명 이상이 남았으면 다른 사용자들에게 퇴장 알림
        if (this.mediasoupServer) {
          this.mediasoupServer.to(`room:${roomId}`).emit('server:user_left', {
            userKey,
            userName,
            producerInfos,
            timestamp: new Date().toISOString(),
          });
        }
      }

      this.logger.log(`✅ 사용자 퇴장 처리 완료: ${userKey} -> ${roomId}`);
    } catch (error) {
      this.logger.error(`❌ 사용자 퇴장 처리 실패: ${userKey} -> ${roomId}`, error);
      throw error;
    }
  }

  /**
   * 방 완전 삭제 (모든 사용자 퇴장, 리소스 정리, 방에 1명 이하가 남았을 때)
   */
  async deleteRoom(roomId: string): Promise<void> {
    try {
      if (this.mediasoupServer) {
        this.mediasoupServer.to(`room:${roomId}`).emit('server:mediasoup_end', {
          roomId,
        });

        const sockets = await this.mediasoupServer.in(`room:${roomId}`).fetchSockets();
        const roomUsers = sockets.map(socket => socket.userKey);

        // 3. 모든 사용자의 리소스 정리 + 여기서 라우터도 정리함 ( 사실 1명임 )
        for (const userKey of roomUsers) {
          await this.cleanUp(userKey);
        }
        // 4. Redis에서 방 관련 데이터 삭제
        for (const userKey of roomUsers) {
          await this.redisService.del(`${this.MEDIASOUP_ROOM_KEY}${userKey}`);
        }

        // 5. 모든 사용자를 room에서 나가게 하기
        for (const socket of sockets) {
          await socket.leave(`room:${roomId}`);
        }
      }

      this.logger.log(`✅ 방 삭제 완료: ${roomId}`);
    } catch (error) {
      this.logger.error(`❌ 방 삭제 실패: ${roomId}`, error);
      throw error;
    }
  }
}
