# ===========================================
# Single Stage (단일 스테이지) - 메모리 절약
# ===========================================
# Node.js 20 버전의 경량 Alpine 리눅스 이미지 사용
FROM node:20-alpine

# 컨테이너 내 작업 디렉토리 생성 및 이동
WORKDIR /app

# 네이티브 모듈 빌드를 위한 빌드 도구 및 pip 설치
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    linux-headers \
    && rm -rf /var/cache/apk/*

# 패키지 매니저 관련 파일 복사
COPY package.json package-lock.json ./

# 의존성 설치
RUN npm ci

# 소스 코드 전체 복사
COPY . .

# TypeScript 빌드
RUN npm run build

# DTLS 인증서 복사 (프로덕션용)
COPY certs/ ./certs/

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=3000

# 포트 노출
EXPOSE 3000

# 헬스체크 (컨테이너 상태 확인) 30초마다 헬스체크 실행 3초 타임아웃 5초 시작 3번 실행
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# 애플리케이션 실행 빌드된 파일 실행
CMD ["node", "dist/main.js"] 