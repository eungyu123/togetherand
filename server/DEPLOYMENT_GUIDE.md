### **1단계: 서버 기본 설정 (먼저)**

```bash
# 시스템 업데이트
sudo apt update && apt upgrade -y

# 필수 패키지 설치
sudo apt install -y curl wget git unzip software-properties-common
```

### 2. Docker 설치

```bash
sudo curl -fsSL https://get.docker.com -o get-docker.sh

sudo sh get-docker.sh

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

sudo chmod +x /usr/local/bin/docker-compose

# Docker 권한 설정
sudo usermod -aG docker ubuntu
# 새 터미널에서 다시 접속하거나
newgrp docker
```

```bash
# UFW 설치 및 활성화, 안해도 문제될건없음
sudo apt install -y ufw
sudo ufw enable

sudo ufw allow 22    # ssh 유지
sudo ufw allow 80    # http
sudo ufw allow 443   # https
```

### **3단계: 프로젝트 코드 가져오기 (세 번째)**

```bash
# https://github.com/settings/tokens 에 들어가서 토큰 생성
mkdir -p ~/nestjs-app
cd ~/nestjs-app

# Git에서 프로젝트 클론
git clone https://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@github.com/eungyu123/make-friend-backend.git .
```

### 2. 환경 변수 설정

```bash
nano .env.prod
cp .env.prod .env
```

### 3. DTLS 인증서 생성

# 프로젝트 디렉토리로 이동

```bash
# 경로이동
cd ~/nestjs-app

#인증서 디렉토리 생성
mkdir -p certs

# 개인키 생성
openssl genrsa -out certs/dtls-key.pem 2048

# 인증서 생성 (자체 서명)
openssl req -new -x509 \
 -key certs/dtls-key.pem \
 -out certs/dtls-cert.pem \
 -days 365 \
 -subj "/C=KR/ST=Seoul/L=Seoul/O=YourCompany/CN=mediasoup-server"

# 인증서 파일 확인
ls -la certs/
```

### 3. 환경 변수 설정

```bash
nano .env.prod
cp .env.prod .env
```

### 4. 애플리케이션 빌드 및 실행

```bash
# 스왑 변경하기 (이미 2G면 4G로 업그레이드)
# 기존 스왑 비활성화 및 삭제
sudo swapoff /swapfile
sudo rm /swapfile

# 새로운 스왑 파일 생성 (mediasoup 때문에 4G 권장)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 재부팅 후에도 유지되도록 fstab 업데이트
sudo sed -i '/\/swapfile/d' /etc/fstab  # 기존 스왑 라인 삭제
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab


# 빌드
docker-compose -f docker-compose.yml build --no-cache

# 컨테이너 실행
docker-compose -f docker-compose.yml up -d

########################################
# 마이그레이션 생성
# docker-compose -f docker-compose.dev.yml exec app npm run migration:generate -- src/database/migrations/InitDatabase

# 마이그레이션 실행
docker-compose -f docker-compose.yml exec -T app npm run migration:run

# 마이그레이션 상태 확인
docker-compose -f docker-compose.yml exec app npm run migration:show

# 로그 확인
docker-compose -f docker-compose.yml logs -f
```

### 4. Nginx 설정 수정

```bash
# nginx 설치
sudo apt install -y nginx

# nginx 설정 복사
sudo cp ~/nestjs-app/nginx/nginx.conf /etc/nginx/nginx.conf

# 설정 테스트
sudo nginx -t

# nginx 시작
sudo systemctl start nginx
sudo systemctl enable nginx

### SSL 인증서 발급  ###
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급 (nginx 설정 자동 업데이트)
# 이 명령어는 nginx 설정을 자동으로 HTTPS로 업데이트합니다
sudo certbot --nginx -d api.togetherand.site

# 자동 갱신 설정
sudo crontab -e
# 추가: 0 12 * * * /usr/bin/certbot renew --quiet

# nginx 재시작
sudo systemctl restart nginx

# 상태 확인
sudo systemctl status nginx

# SSL 인증서 발급 후 테스트
curl -I https://api.togetherand.site/health
curl -I https://api.togetherand.site/socket.io/
```

### 데이터베이스 백업

```bash
# 수동 백업
docker-compose -f docker-compose.yml exec postgres pg_dump -U nestjs_user nestjs_db_prod > backup.sql
# 데이터베이스 백업
docker-compose -f docker-compose.yml exec postgres pg_dump -U nestjs_user nestjs_db_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# 백업 파일을 S3나 다른 곳에 업로드
# aws s3 cp backup_*.sql s3://your-backup-bucket/
```

```bash
https://github.com/eungyu123/make-friend-backend/settings/secrets/actions에
# 깃헙 액션 파일 작성하기
# 아마존 .pem 파일 복사 붙여넣기
```
