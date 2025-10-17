/**
 * Mediasoup configuration
 */
export const mediasoupConfig = () => ({
  mediasoup: {
    workerOptions: {
      rtcMinPort: 40000, // WebRTC 관련 통신에서 사용할 최소 포트 번호 (좁은 범위)
      rtcMaxPort: 40100, // WebRTC 관련 통신에서 사용할 최대 포트 번호 (좁은 범위)
      dtlsCertificateFile: process.env.NODE_ENV === 'production' ? '/app/certs/dtls-cert.pem' : undefined, // DTLS 인증서 파일 경로, 없으면 자동 생성
      dtlsPrivateKeyFile: process.env.NODE_ENV === 'production' ? '/app/certs/dtls-key.pem' : undefined, // DTLS 개인키 파일 경로, 없으면 자동 생성 => 배포할때는 무조건 만들어야함
      appData: { developer: 'jackson', server: 'kr-1', env: 'production' }, // 애플리케이션 데이터, 커스텀 데이터 저장
    },
    routerOptions: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
          },
        },
      ],
    },
    webRtcTransportOptions: {
      // 네트워크 인터페이스 설정
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: '127.0.0.1', // 외부 공개 IP (NAT 환경에서 필요)
        },
      ],

      // 프로토콜 설정
      enableUdp: true, // UDP 통신 활성화 (대부분 WebRTC 클라이언트는 UDP 선호)
      enableTcp: true, // TCP 통신 활성화 (방화벽 환경에서 필요)
      preferUdp: true, // UDP 통신 우선

      // 비트레이트 설정
      initialAvailableOutgoingBitrate: 1000000, // 초기 비트레이트 1Mbps

      // 추가 옵션 (선택사항)
      maxSctpMessageSize: 262144, // SCTP 메시지 최대 크기

      // 앱 데이터 (디버깅용)
    },
  },
});
