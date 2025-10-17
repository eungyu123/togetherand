# Make Friend Backend

## 프로젝트 개요

사용자 매칭, 채팅, 게시글 기능을 제공하는 소셜 플랫폼 백엔드

## 데이터베이스 ERD

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar user_name UK
        varchar phone_number
        boolean is_active
        varchar role
        timestamp last_login_at
        varchar last_login_ip
        varchar provider
        varchar social_id
        varchar photo_url
        text self_introduction
        int age
        varchar location
        text_array play_games
        timestamp created_at
        timestamp updated_at
    }

    FRIENDSHIPS {
        uuid id PK
        uuid user_id FK
        uuid friend_id FK
        timestamp created_at
    }

    FRIEND_REQUESTS {
        uuid id PK
        uuid requester_id FK
        uuid recipient_id FK
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    CHAT_ROOMS {
        uuid id PK
        varchar name
        varchar type
        varchar image_url
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    CHAT_ROOM_MEMBERS {
        uuid id PK
        uuid chat_room_id FK
        uuid user_id FK
        varchar role
        timestamp created_at
        timestamp updated_at
    }

    CHAT_MESSAGES {
        uuid id PK
        uuid chat_room_id FK
        uuid sender_id FK
        varchar type
        text content
        uuid reply_to_id FK
        timestamp created_at
        timestamp updated_at
    }

    MATCHES {
        uuid id PK
        varchar type
        varchar status
        varchar room_url
        timestamp created_at
        timestamp ended_at
    }

    MATCH_USERS {
        uuid match_id PK,FK
        uuid user_id PK,FK
        varchar result
        text feedback
        timestamp joined_at
    }

    CATEGORIES {
        uuid id PK
        varchar name UK
        text description
        varchar slug UK
        timestamp created_at
        timestamp updated_at
    }

    POSTS {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        varchar title
        varchar subtitle
        text content
        varchar slug UK
        varchar status
        int view_count
        int like_count
        int comment_count
        varchar featured_image_url
        timestamp published_at
        timestamp created_at
        timestamp updated_at
    }

    COMMENTS {
        uuid id PK
        uuid post_id FK
        uuid user_id FK
        uuid parent_id FK
        varchar nickname
        varchar password_hash
        text content
        int like_count
        timestamp created_at
        timestamp updated_at
    }

    LIKES {
        uuid id PK
        uuid user_id FK
        uuid target_id
        varchar target_type
        timestamp created_at
    }

    TAGS {
        uuid id PK
        varchar name UK
        varchar slug UK
        timestamp created_at
    }

    %% User Relationships
    USERS ||--o{ FRIENDSHIPS : "user_id"
    USERS ||--o{ FRIENDSHIPS : "friend_id"
    USERS ||--o{ FRIEND_REQUESTS : "requester_id"
    USERS ||--o{ FRIEND_REQUESTS : "recipient_id"
    USERS ||--o{ CHAT_ROOMS : "created_by"
    USERS ||--o{ CHAT_ROOM_MEMBERS : "user_id"
    USERS ||--o{ CHAT_MESSAGES : "sender_id"
    USERS ||--o{ MATCH_USERS : "user_id"
    USERS ||--o{ POSTS : "user_id"
    USERS ||--o{ COMMENTS : "user_id"
    USERS ||--o{ LIKES : "user_id"

    %% Chat Relationships
    CHAT_ROOMS ||--o{ CHAT_ROOM_MEMBERS : "chat_room_id"
    CHAT_ROOMS ||--o{ CHAT_MESSAGES : "chat_room_id"
    CHAT_MESSAGES ||--o{ CHAT_MESSAGES : "reply_to_id"

    %% Match Relationships
    MATCHES ||--o{ MATCH_USERS : "match_id"

    %% Post Relationships
    CATEGORIES ||--o{ POSTS : "category_id"
    POSTS ||--o{ COMMENTS : "post_id"
    COMMENTS ||--o{ COMMENTS : "parent_id"
    POSTS ||--o{ LIKES : "target_id"
    COMMENTS ||--o{ LIKES : "target_id"
```

## 기술 스택

- **Backend**: NestJS
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: JWT
- **Real-time**: WebSocket
- **File Storage**: AWS S3

## 주요 기능

- 사용자 인증 및 관리
- 친구 요청 및 관리
- 실시간 채팅
- 게임 매칭
- 게시글 및 댓글
- 파일 업로드

## 설치 및 실행

### 환경 요구사항

- Node.js 18+
- PostgreSQL 13+
- Redis 6+

### 설치

```bash
npm install
```

### 환경 설정

```bash
cp .env.example .env
# .env 파일을 편집하여 데이터베이스 및 기타 설정을 구성
```

### 실행

```bash
# 개발 모드
npm run start:dev

# 프로덕션 모드
npm run build
npm run start:prod
```

## API 문서

- Swagger UI: `http://localhost:3000/api`

## 라이선스

MIT
