import { Injectable, Logger } from '@nestjs/common';
import { RedisService, ZSetEntry } from 'src/redis/redis.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { getQueueKey } from './utils/match.utils';
import { Server } from 'socket.io';

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);
  private matchServer: Server;

  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    private readonly redisService: RedisService
  ) {}

  /**
   * Server 인스턴스 설정
   */
  setServer(server: Server): void {
    this.matchServer = server;
  }

  /**
   * ✅ 매칭 요청 생성 및 대기 큐에 추가
   */
  async createMatchRequest(dto: { gameType: string }, userKey: string) {
    const { gameType } = dto;

    try {
      // 1. 현재 시간을 점수로 사용 (FIFO 큐)
      const timestamp = Date.now();
      const queueKey = getQueueKey(gameType);

      // 2. 대기 큐에 사용자 추가
      await this.redisService.zadd(queueKey, timestamp, userKey);

      this.logger.log(`✅ 사용자 ${userKey}가 ${gameType} 매칭 대기 큐에 추가되었습니다.`);

      // 4. 큐 위치 알림 전송
      const position = await this.getQueuePosition(userKey, gameType);

      // 5. 매칭시도 -> 매칭 성사 시 알림 전송
      // 해당 메서드는 다른 함수에서 실행되므로 여기서는 실행하지 않음

      return { position };
    } catch (error) {
      this.logger.error('Failed to create match request:', error);
      throw error;
    }
  }

  /**
   * 매칭 시도 (매칭 알고리즘)
   */
  async tryMatchmaking(gameType: string) {
    try {
      const queueKey = getQueueKey(gameType);

      // 대기 큐 크기 확인
      const queueSize = await this.redisService.zcard(queueKey);

      if (queueSize < 2) {
        this.logger.debug(`❌ 대기큐에 충분한 사용자가 없습니다. queueKey: ${queueKey}, queueSize: ${queueSize}`);
        return;
      }

      // 매칭 조건에 따라 사용자들을 선택
      const matchedUsers = await this.findMatchingUsers(gameType);

      if (matchedUsers.length >= 2) {
        // 매칭 성사 - 매치 생성
        const result = await this.createMatch(matchedUsers, gameType);
        return {
          success: true,
          roomId: result.roomId,
          userKeys: matchedUsers,
        };
      }

      return {
        success: false,
        roomId: null,
        userKeys: [],
      };
    } catch (error) {
      this.logger.error(`❌ 매칭 시도 실패: ${gameType}`, error);
    }
  }

  /**
   * ✅ 매칭 요청 취소
   */
  async cancelMatchRequest(userKey: string, dto: { gameType: string }): Promise<boolean> {
    try {
      const { gameType } = dto;
      const queueKey = getQueueKey(gameType);

      // 1. 대기 큐에서 사용자 제거
      await this.redisService.zrem(queueKey, userKey);

      // this.logger.log(`✅ 사용자 ${userKey}가 ${gameType} 매칭 대기 큐에서 제거되었습니다.`);

      return true;
    } catch (error) {
      this.logger.error('Failed to cancel match request:', error);
      throw error;
    }
  }

  /**
   * ✅ 대기 중인 매칭 요청 목록 조회
   */
  async getWaitingMatchRequests(query: { gameType: string }, all: boolean = false): Promise<{ total: number }> {
    try {
      const { gameType } = query;

      // 모든 큐의 크기 조회 비동기로 실행하여 배열로 반환
      const total = await this.redisService.zcard(getQueueKey(gameType));

      return { total };
    } catch (error) {
      this.logger.error('❌ 대기 중인 매칭 요청 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 매칭 조건에 맞는 사용자들 찾기
   * 추후 수정 필요
   */
  private async findMatchingUsers(gameType: string): Promise<string[]> {
    // 매칭 알고리즘은 프로젝트가 어느정도 완성되면 넣기
    // 지금은 상당히 안좋음 추후 수정 필요

    const queueKey = getQueueKey(gameType);

    // 가장 오래 기다린 사용자부터 조회
    const candidates = (await this.redisService.zpopmin(queueKey, 5)) as ZSetEntry[];

    if (candidates.length < 2) {
      // 충분한 사용자가 없으면 다시 큐에 넣기
      for (const candidate of candidates) {
        await this.redisService.zadd(queueKey, candidate.score, candidate.member);
      }
      return [];
    }

    // 간단한 매칭 로직: 대기 시간이 비슷한 사용자들을 매칭
    const matchedUsers: string[] = [];
    const maxWaitTimeDiff = 5 * 60 * 1000; // 5분 차이까지 허용

    for (let i = 0; i < candidates.length - 1; i++) {
      const current = candidates[i];
      const next = candidates[i + 1];

      if (next.score - current.score <= maxWaitTimeDiff) {
        matchedUsers.push(current.member, next.member);
        i++; // 다음 사용자는 이미 매칭됨
      } else {
        // 매칭되지 않은 사용자는 다시 큐에 넣기
        await this.redisService.zadd(queueKey, current.score, current.member);
      }
    }

    // 남은 사용자들도 다시 큐에 넣기
    for (let i = matchedUsers.length; i < candidates.length; i++) {
      const candidate = candidates[i];
      await this.redisService.zadd(queueKey, candidate.score, candidate.member);
    }

    return matchedUsers;
  }

  /**
   * 매치 생성 (mediasoup 방 생성 포함)
   * 매칭 인원이 충분할 때 실행
   */
  private async createMatch(userKeys: string[], gameType: string) {
    try {
      // 1. DB에 매치 생성
      const savedMatch = await this.matchRepository.save({
        type: gameType,
        createdAt: new Date(),
      });

      this.logger.log(`✅ 매칭 성사! Match ID: ${savedMatch.id}, Users: ${userKeys.join(', ')}`);

      return {
        roomId: savedMatch.id,
      };
    } catch (error) {
      this.logger.error('Failed to create match:', error);
      throw error;
    }
  }

  /**
   * 큐에서 사용자의 위치 조회
   */
  async getQueuePosition(userKey: string, gameType: string): Promise<number> {
    try {
      const queueKey = getQueueKey(gameType);
      const score = await this.redisService.zscore(queueKey, userKey);

      // 큐에 없으면 -1 반환
      if (score === null) {
        this.logger.debug(`❌ 큐에 없는 사용자: queueKey: ${queueKey}, userKey: ${userKey}, score: ${score}`);
        return -1;
      }

      // 해당 점수보다 작은 점수를 가진 멤버 수 = 위치
      const position = await this.redisService.zcount(queueKey, 0, score - 1);

      this.logger.debug(
        `✅ 큐 위치 조회: queueKey: ${queueKey}, userKey: ${userKey}, score: ${score}, position: ${position}`
      );
      return position + 1; // 1-based position
    } catch (error) {
      this.logger.error('❌ 큐 위치 조회 실패:', error);
      return -1;
    }
  }

  /**
   * 룸 참가자 수 조회
   */
  async getRoomMemberCount(roomId: string): Promise<number> {
    if (!this.matchServer) return 0;

    try {
      const sockets = await this.matchServer.in(`room:${roomId}`).fetchSockets();
      return sockets.length;
    } catch (error) {
      this.logger.error(`룸 참가자 수 조회 실패: ${roomId}`, error);
      return 0;
    }
  }
}
