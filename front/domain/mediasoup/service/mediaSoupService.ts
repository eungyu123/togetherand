import * as mediasoupClient from 'mediasoup-client';
import { types as mediasoupTypes } from 'mediasoup-client';
import { logger } from '@/shared/utils/logger';
import { MediasoupSocket } from '../socket/mediasoupSocket';

export class MediaSoupService {
  private device: mediasoupClient.Device | null = null;
  private sendTransports: mediasoupTypes.Transport | null = null; // 전송 트랜스 포트는 무조건 하나 있음
  private recvTransports: mediasoupTypes.Transport | null = null; // 수신 트랜스 포트는 무조건 하나 있음
  private producers: Map<string, mediasoupTypes.Producer | null> = new Map(); // trackType: 'audio' | 'video' -> producer
  private consumers: Map<string, mediasoupTypes.Consumer> = new Map(); // 복합 키: 'roomId:producerId:trackType' -> consumer, 상대방의 프로듀서 아이디로 컨슈머 저장
  private static instance: MediaSoupService;

  public static getInstance(): MediaSoupService {
    if (!MediaSoupService.instance) {
      MediaSoupService.instance = new MediaSoupService();
    }
    return MediaSoupService.instance;
  }

  private constructor() {}

  /**
   * 컨슈머 키 생성 헬퍼
   */
  private getConsumerKey(
    roomId: string,
    producerId: string,
    trackType: 'audio' | 'video' | 'screen'
  ): string {
    return `${roomId}:${producerId}:${trackType}`;
  }

  /**
   * 브라우저가 비디오 방향 헤더 확장을 지원하는지 확인
   */
  private supportsVideoOrientationHeaderExtension(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();

    // Chrome 확인 (Edge 제외)
    const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');

    // Safari 확인 (Chrome 제외)
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');

    // Firefox 확인
    const isFirefox = userAgent.includes('firefox');

    // Edge 확인
    const isEdge = userAgent.includes('edg');

    return isChrome || isSafari || isFirefox || isEdge;
  }

  /**
   * ICE 서버 설정 가져오기 (Google STUN 서버)
   */
  private getIceServers(): RTCIceServer[] {
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ];
  }

  /**
   * MediaSoup 디바이스 초기화
   */
  async initializeDevice(
    routerRtpCapabilities: mediasoupTypes.RtpCapabilities
  ): Promise<mediasoupClient.Device> {
    try {
      if (this.device) return this.device;

      this.device = await mediasoupClient.Device.factory();
      mediasoupClient.parseScalabilityMode('L1T3');

      // 비디오 방향 헤더 확장 지원 여부 확인
      const supportsVideoOrientation = this.supportsVideoOrientationHeaderExtension();

      if (supportsVideoOrientation) {
        // Chrome, Safari, libwebrtc 기반 브라우저의 경우 "urn:3gpp:video-orientation" 확장 제거
        routerRtpCapabilities.headerExtensions = routerRtpCapabilities.headerExtensions?.filter(
          ext => ext.uri !== 'urn:3gpp:video-orientation'
        );
        logger.debug('✅ 비디오 방향 헤더 확장 제거됨 (Chrome/Safari/libwebrtc)');
      }

      await this.device.load({ routerRtpCapabilities });

      logger.info('✅ MediaSoup Device 초기화 완료');
      return this.device;
    } catch (error) {
      if (error instanceof Error && error.name === 'UnsupportedError') {
        console.warn('❌ 브라우저가 MediaSoup을 지원하지 않습니다');
        throw new Error('❌ 브라우저가 MediaSoup을 지원하지 않습니다');
      }
      throw error;
    }
  }

  /**
   * 전송 트랜스포트 생성
   */
  async createSendTransport(
    socket: MediasoupSocket,
    roomId: string,
    transport_option: {
      id: string;
      iceParameters: mediasoupTypes.IceParameters;
      iceCandidates: mediasoupTypes.IceCandidate[];
      dtlsParameters: mediasoupTypes.DtlsParameters;
    }
  ) {
    if (this.sendTransports) {
      this.sendTransports.close();
      this.sendTransports = null;
    }

    const send_transport = this.device?.createSendTransport({
      ...transport_option,
      iceServers: this.getIceServers(),
    });
    if (!send_transport) return;

    send_transport.on('connectionstatechange', state => {
      logger.info('[WebRTC] sendTransport connection state:', state);
    });

    send_transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        socket.getSocket?.emit(
          'client:connect_web_rtc_transport',
          { id: send_transport.id, dtlsParameters, test: 'send' },
          (response: { success: boolean }) => {
            if (response.success) {
              callback();
            } else {
              errback(new Error('WebRTC 연결 실패'));
            }
          }
        );
      } catch (error) {
        errback(error as Error);
      }
    });

    // produce 이벤트 리스너 등록
    send_transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        socket.getSocket?.emit(
          'client:produce',
          {
            roomId,
            transportId: send_transport.id,
            kind,
            rtpParameters,
            trackType: appData.trackType,
          },
          (response: { success: boolean; producerId: string; roomId: string; error?: string }) => {
            if (response.success) {
              callback({ id: response.producerId });
            } else {
              errback(new Error(response.error || '프로듀서 생성 실패'));
            }
          }
        );
      } catch (error) {
        errback(error as Error);
      }
    });

    // 룸 아이디를 키로 전송 트랜스포트 저장
    this.sendTransports = send_transport;

    return send_transport;
  }

  /**
   * 수신 트랜스포트 생성
   */
  async createRecvTransport(
    socket: MediasoupSocket,
    roomId: string,
    transport_option: {
      id: string;
      iceParameters: mediasoupTypes.IceParameters;
      iceCandidates: mediasoupTypes.IceCandidate[];
      dtlsParameters: mediasoupTypes.DtlsParameters;
    }
  ) {
    // 기존 트랜스포트가 있으면 정리하고 새로 생성 (룸별로 새로운 트랜스포트)
    if (this.recvTransports) {
      this.recvTransports.close();
      this.recvTransports = null;
    }

    const recv_transport = this.device?.createRecvTransport({
      ...transport_option,
      iceServers: this.getIceServers(),
    });
    if (!recv_transport) return null;

    recv_transport.on('connectionstatechange', state => {
      logger.info('[WebRTC] recvTransport connection state:', state);
    });

    recv_transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        socket.getSocket?.emit(
          'client:connect_web_rtc_transport',
          { id: recv_transport.id, dtlsParameters, roomId, test: 'recv' },
          (response: { success: boolean }) => {
            if (response.success) {
              callback();
            } else {
              errback(new Error('WebRTC 연결 실패'));
            }
          }
        );
      } catch (error) {
        errback(error as Error);
      }
    });

    // 룸 아이디를 키로 수신 트랜스포트 Map 조회
    this.recvTransports = recv_transport;

    return recv_transport;
  }

  /**
   * MediaStream이 유효한지 확인
   */
  private isMediaStreamValid(stream: MediaStream | null): boolean {
    if (!stream) return false;

    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();

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
  }

  /**
   * 화면공유 프로듀서 생성
   */
  async createScreenProducer(
    sendTransport: mediasoupTypes.Transport,
    screenStream: MediaStream | null
  ) {
    try {
      if (!sendTransport) {
        logger.error('❌ 전송 트랜스포트가 없습니다');
        return null;
      }
      if (!screenStream) {
        logger.error('❌ 화면공유 스트림이 없습니다');
        return null;
      }
      if (!this.isMediaStreamValid(screenStream)) {
        logger.error('❌ MediaStream이 유효하지 않습니다. 새로운 스트림이 필요합니다.');
        return;
      }

      // 스크린 트랙이 있으면 스크린 프로듀서 생성
      const screenVideoTrack = screenStream.getVideoTracks()[0];
      let screenProducer: mediasoupTypes.Producer | null = null;
      if (screenVideoTrack) {
        if (screenVideoTrack.readyState === 'ended') {
          logger.warn('⚠️ 화면공유 비디오 트랙이 이미 종료되었습니다.');
          return null;
        }

        screenProducer = await sendTransport.produce({
          track: screenVideoTrack,
          encodings: [{ maxBitrate: 2000000 }], // 화면공유는 더 높은 비트레이트 사용
          codecOptions: {
            videoGoogleStartBitrate: 2000,
          },
          appData: {
            trackType: 'screen',
          },
        });
        logger.info('✅ 화면공유 프로듀서 생성 완료:', screenProducer?.id);
      }

      // 화면공유 프로듀서를 별도로 저장
      this.producers.set('screen', screenProducer);

      return screenProducer;
    } catch (error) {
      logger.error('❌ 화면공유 프로듀서 생성 실패:', error);
      return null;
    }
  }

  /**
   * 프로듀서 생성
   */
  async createProducer(sendTransport: mediasoupTypes.Transport, localStream: MediaStream | null) {
    try {
      if (!sendTransport) {
        logger.error('❌ 전송 트랜스포트가 없습니다');
        return;
      }
      if (!localStream) {
        logger.error('❌ 로컬 미디어 스트림이 없습니다');
        return;
      }
      if (!this.isMediaStreamValid(localStream)) {
        logger.error('❌ MediaStream이 유효하지 않습니다. 새로운 스트림이 필요합니다.');
        return;
      }

      // 비디오 트랙이 있으면 비디오 프로듀서 생성
      const videoTrack = localStream.getVideoTracks()[0];
      let videoProducer: mediasoupTypes.Producer | null = null;
      if (videoTrack) {
        if (videoTrack.readyState === 'ended') {
          logger.warn('⚠️ 비디오 트랙이 이미 종료되었습니다. 새로운 스트림이 필요합니다.');
          return;
        }
        try {
          videoProducer = await sendTransport.produce({
            track: videoTrack,
            encodings: [{ maxBitrate: 2000000 }, { maxBitrate: 300000 }, { maxBitrate: 900000 }],
            codecOptions: {
              videoGoogleStartBitrate: 2000,
            },
            appData: {
              trackType: 'video',
            },
          });
          logger.info('✅ 비디오 프로듀서 생성 완료:', videoProducer.id);
        } catch (error) {
          logger.error('❌ 비디오 프로듀서 생성 실패:', error);
          return;
        }
      } else {
        logger.warn('⚠️ 비디오 트랙이 없습니다. 새로운 스트림이 필요합니다.');
      }

      // 오디오 트랙이 있으면 오디오 프로듀서 생성
      const audioTrack = localStream.getAudioTracks()[0];

      let audioProducer: mediasoupTypes.Producer | null = null;
      if (audioTrack) {
        if (audioTrack.readyState === 'ended') {
          logger.warn('⚠️ 오디오 트랙이 이미 종료되었습니다. 새로운 스트림이 필요합니다.');
          return;
        }

        try {
          audioProducer = await sendTransport.produce({
            track: audioTrack,
            appData: {
              trackType: 'audio',
            },
          });
          logger.info('✅ 오디오 프로듀서 생성 완료:', audioProducer.id);
        } catch (error) {
          logger.error('❌ 오디오 프로듀서 생성 실패:', error);
          return;
        }
      } else {
        logger.warn('⚠️ 오디오 트랙이 없습니다. 새로운 스트림이 필요합니다.');
      }

      // 프로듀서가 하나도 생성되지 않았다면 에러
      if (!videoProducer && !audioProducer) {
        logger.error('❌ 비디오와 오디오 프로듀서 모두 생성에 실패했습니다.');
        return;
      }

      // 트랙 타입을 키로 프로듀서 저장
      if (videoProducer) this.producers.set('video', videoProducer);
      if (audioProducer) this.producers.set('audio', audioProducer);

      return {
        videoProducer,
        audioProducer,
      };
    } catch (error) {
      logger.error('❌ 프로듀서 생성 실패:', error);
      throw error; // 에러를 다시 던져서 호출자가 처리할 수 있도록 함
    }
  }

  /**
   * 컨슈머 생성
   */
  async createConsumer(
    roomId: string | undefined,
    recvTransport: mediasoupTypes.Transport | null,
    consumer_option: {
      consumerId: string;
      producerId: string;
      kind: 'audio' | 'video';
      rtpParameters: mediasoupTypes.RtpParameters;
      trackType: 'audio' | 'video' | 'screen';
    }
  ) {
    try {
      const { consumerId, producerId, kind, rtpParameters, trackType } = consumer_option;
      const streamId = `${producerId}-mic-webcam`;

      if (!recvTransport || !roomId) return null;

      const consumer = await recvTransport.consume({
        id: consumerId,
        producerId,
        kind,
        rtpParameters,
        streamId,
        appData: {
          trackType,
        },
      });

      // 복합 키로 컨슈머 저장
      const key = this.getConsumerKey(roomId, producerId, trackType);
      this.consumers.set(key, consumer);

      return consumer;
    } catch (e) {
      console.error('❌ 컨슈머 생성 실패:', e);
    }
  }

  /**
   * 프로듀서 정지
   */
  pauseProducer(trackType: 'audio' | 'video'): void {
    const producer = this.producers.get(trackType);
    if (producer && !producer.paused) {
      producer.pause();
      console.log('⏸️ 프로듀서 정지:', trackType);
    }
  }

  /**
   * 프로듀서 재개
   */
  resumeProducer(trackType: 'audio' | 'video'): void {
    const producer = this.producers.get(trackType);
    if (producer && producer.paused) {
      producer.resume();
      console.log('▶️ 프로듀서 재개:', trackType);
    }
  }

  /**
   * 프로듀서 닫기
   */
  closeProducer(trackType: 'audio' | 'video' | 'screen'): void {
    const producer = this.producers.get(trackType);
    if (producer) {
      producer.close();
      this.producers.delete(trackType);
      console.log('🔒 프로듀서 닫기:', trackType);
    }
  }

  /**
   * 컨슈머 닫기
   */
  closeConsumer(roomId: string, producerId: string, trackType: 'audio' | 'video' | 'screen'): void {
    const key = this.getConsumerKey(roomId, producerId, trackType);
    const consumer = this.consumers.get(key);
    if (consumer) {
      consumer.close();
      this.consumers.delete(key);
      console.log('🔒 컨슈머 닫기:', producerId, trackType);
    }
  }

  /**
   * 특정 유저의 모든 컨슈머 닫기
   * @param roomId - 룸 ID
   * @param producerInfos - 유저의 프로듀서 ID 배열 (비디오, 오디오)
   */
  closeUserConsumers(
    roomId: string,
    producerInfos: { producerId: string; trackType: 'audio' | 'video' | 'screen' }[]
  ): void {
    // 모든 프로듀서 ID에 대해 컨슈머를 시도
    producerInfos.forEach(producerInfo => {
      const { producerId, trackType } = producerInfo;
      //  컨슈머 정리
      const key = this.getConsumerKey(roomId, producerId, trackType);
      const consumer = this.consumers.get(key);
      if (consumer) {
        consumer.close();
        this.consumers.delete(key);
      }
    });

    logger.info(`✅ 유저 컨슈머 정리 완료`);
  }

  /**
   * getter
   */
  get getDevice(): mediasoupTypes.Device | null {
    return this.device;
  }

  getRecvTransport(): mediasoupTypes.Transport | null {
    return this.recvTransports;
  }

  getSendTransport(): mediasoupTypes.Transport | null {
    return this.sendTransports;
  }

  /**
   * 모든 트랜스포트 정리
   */
  cleanup(): void {
    logger.info('🧹 MediaSoup 트랜스포트 정리 시작');

    this.consumers.forEach(consumer => consumer?.close());
    this.consumers.clear();
    logger.info('✅ 컨슈머 정리 완료');

    this.closeProducer('video');
    this.closeProducer('audio');
    this.closeProducer('screen');
    logger.info('✅ 프로듀서 정리 완료');

    if (this.sendTransports) {
      this.sendTransports.close();
      this.sendTransports = null;
      logger.info('✅ 전송 트랜스포트 정리 완료');
    }

    if (this.recvTransports) {
      this.recvTransports.close();
      this.recvTransports = null;
      logger.info('✅ 수신 트랜스포트 정리 완료');
    }
  }

  // 검토하기
}

export const mediaSoupService = MediaSoupService.getInstance();
