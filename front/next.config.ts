import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,

  images: {
    // Next.js 15에서 권장하는 이미지 최적화 설정
    // remotePatterns: 외부 도메인에서 이미지를 로드할 때 보안을 위해 사용
    remotePatterns: [
      {
        protocol: 'https', // HTTPS 프로토콜만 허용 (보안)
        hostname: 'portfolio-jackson.s3.ap-northeast-2.amazonaws.com', // AWS S3 버킷 호스트명
        pathname: '/**', // 모든 경로 허용 (필요에 따라 제한 가능)
        // port: 443, // 기본 HTTPS 포트 (선택사항)
      },
    ],

    // Next.js 15에서 추가된 성능 최적화 옵션들
    formats: ['image/webp', 'image/avif'], // 최신 이미지 포맷 지원
    minimumCacheTTL: 60, // 캐시 TTL (초)
    dangerouslyAllowSVG: false, // SVG 보안 설정 (기본값: false)
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;", // SVG CSP

    // 이미지 품질 설정 (선택사항)
    // quality: 75, // 기본값: 75

    // 디바이스 크기별 이미지 최적화 (선택사항)
    // deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
