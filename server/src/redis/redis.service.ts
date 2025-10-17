import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

// KeyvEntry 인터페이스 정의
export interface KeyvEntry {
  key: string;
  value: any;
  ttl?: number;
}

// ZSET 엔트리 인터페이스
export interface ZSetEntry {
  member: string;
  score: number;
}

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async checkRedisConnection(): Promise<string> {
    try {
      // Redis 연결 테스트
      await this.redis.setex('connection-test', 1, 'ok');
      const result = await this.redis.get('connection-test');
      await this.redis.del('connection-test');

      if (result === 'ok') {
        this.logger.log('✅ Redis 연결 성공');
        return 'Connected';
      } else {
        this.logger.error('❌ Redis 연결 실패');
        return 'Failed';
      }
    } catch (error) {
      this.logger.error('❌ Redis 연결 실패:', error);
      return 'Error';
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);

      if (ttl) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }

      if (!key.startsWith('throttle:')) {
        this.logger.debug(`🐛 Redis 저장 성공: ${key} with TTL: ${ttl || 'default'}`);
      }
    } catch (error) {
      this.logger.error(`❌ Redis 설정 실패: ${key}`, error);
      throw new Error(`Redis 저장 실패: ${error.message}`);
    }
  }

  async setMany(entries: KeyvEntry[]): Promise<void> {
    try {
      // 여러 키-값을 한 번에 설정
      for (const entry of entries) {
        if (entry.ttl) {
          await this.redis.setex(entry.key, entry.ttl, JSON.stringify(entry.value));
        } else {
          await this.redis.set(entry.key, JSON.stringify(entry.value));
        }
      }
      this.logger.debug(`Set ${entries.length} keys in batch`);
    } catch (error) {
      this.logger.error(`❌ Redis 설정 실패:`, error);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    try {
      const result = await this.redis.get(key);
      if (!key.startsWith('throttle:')) {
        this.logger.debug(`🐛 Redis 조회 성공: ${key}, result: ${result !== null ? 'found' : 'not found'}`);
      }
      if (result) {
        try {
          return JSON.parse(result);
        } catch (parseError) {
          this.logger.warn(`JSON 파싱 실패: ${key}, raw value: ${result}`);
          return result; // JSON이 아닌 경우 원본 반환
        }
      }
      return null;
    } catch (error) {
      this.logger.error(`❌ Redis 조회 실패: ${key}`, error);
      throw new Error(`Redis 조회 실패: ${error.message}`);
    }
  }

  async getMany(keys: string[]): Promise<any[]> {
    try {
      // 여러 키를 병렬로 조회
      const promises = keys.map(key => this.redis.get(key));
      const results = await Promise.all(promises);
      this.logger.debug(`🐛 Redis 조회 성공: ${keys.length} keys, found ${results.filter(r => r !== null).length}`);
      return results.map(result => (result ? JSON.parse(result) : null));
    } catch (error) {
      this.logger.error(`❌ Redis 조회 실패:`, error);
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const value = await this.redis.get(key);
      const exists = value !== null;
      this.logger.debug(`🐛 Redis 조회 성공: ${key}, exists: ${exists}`);
      return exists;
    } catch (error) {
      this.logger.error(`❌ Redis 조회 실패: ${key}`, error);
      throw error;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      this.logger.debug(`🐛 Redis 삭제 성공: ${key}, deleted: ${result > 0}`);
      return result > 0;
    } catch (error) {
      this.logger.error(`❌ Redis 삭제 실패: ${key}`, error);
      throw error;
    }
  }

  async deleteMany(keys: string[]): Promise<boolean[]> {
    try {
      // 여러 키를 병렬로 삭제
      const promises = keys.map(key => this.redis.del(key));
      const results = await Promise.all(promises);
      this.logger.debug(`🐛 Redis 삭제 성공: ${keys.length} keys, deleted: ${results.filter(r => r > 0).length}`);
      return results.map(result => result > 0);
    } catch (error) {
      this.logger.error(`❌ Redis 삭제 실패:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      // 모든 키 삭제 (개별 삭제로 구현)
      await this.clearAllKeys();
      this.logger.debug('Cleared all keys');
    } catch (error) {
      this.logger.error('❌ 레디스 삭제 실패:', error);
      throw error;
    }
  }

  async clearByPrefix(prefix: string): Promise<number> {
    try {
      // prefix로 시작하는 모든 키 조회
      const keysToDelete = await this.redis.keys(`${prefix}*`);

      if (keysToDelete.length > 0) {
        await this.deleteMany(keysToDelete);
        this.logger.debug(`🐛 레디스 전체 삭제 성공: ${keysToDelete.length} keys with prefix: ${prefix}`);
        return keysToDelete.length;
      }

      return 0;
    } catch (error) {
      this.logger.error(`❌ 레디스 삭제 실패 프리픽스: ${prefix}`, error);
      throw error;
    }
  }

  /**
   * prefix로 시작하는 모든 키들 조회
   */
  async getKeysByPrefix(prefix: string): Promise<string[]> {
    try {
      const keys = await this.redis.keys(`${prefix}*`);
      this.logger.debug(`🐛 레디스 프리픽스 키들 조회 성공: ${keys.length} keys with prefix: ${prefix}`);
      return keys;
    } catch (error) {
      this.logger.error(`❌ 레디스 조회 실패 프리픽스: ${prefix}`, error);
      return []; // 빈 배열 반환하여 앱이 중단되지 않도록 함
    }
  }

  async getStats(): Promise<{
    totalKeys: number;
    keysByPrefix: Record<string, number>;
    memoryUsage?: any;
  }> {
    try {
      const keys = await this.redis.keys('*');
      const keysByPrefix: Record<string, number> = {};

      // prefix별로 키 개수 계산
      keys.forEach(key => {
        const prefix = key.split(':')[0];
        keysByPrefix[prefix] = (keysByPrefix[prefix] || 0) + 1;
      });

      const stats = {
        totalKeys: keys.length,
        keysByPrefix,
        memoryUsage: process.memoryUsage(),
      };

      this.logger.debug(`🐛 레디스 조회 성공: ${JSON.stringify(stats)}`);
      return stats;
    } catch (error) {
      this.logger.error('❌ 레디스 조회 실패:', error);
      throw error;
    }
  }

  async setWithExpiry(key: string, value: any, ttl: number): Promise<void> {
    try {
      // 만료 시간과 함께 값 설정
      await this.redis.setex(key, Math.floor(ttl / 1000), JSON.stringify(value));
      this.logger.debug(`Set key: ${key} with TTL: ${ttl}ms`);
    } catch (error) {
      this.logger.error(`❌ Redis 설정 실패: ${key}`, error);
      throw error;
    }
  }

  async getWithTTL(key: string): Promise<{ value: any; ttl?: number }> {
    try {
      // TTL 정보와 함께 값 조회
      const value = await this.redis.get(key);
      const ttl = await this.redis.ttl(key);
      const result = {
        value: value ? JSON.parse(value) : undefined,
        ttl: ttl > 0 ? ttl * 1000 : undefined,
      };
      this.logger.debug(`🐛 Redis 조회 성공: ${key}, value: ${value !== null ? 'found' : 'not found'}, ttl: ${ttl}s`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis 조회 실패: ${key}`, error);
      throw error;
    }
  }

  private async clearAllKeys(): Promise<void> {
    try {
      // 모든 키 조회 후 삭제
      const keysToDelete = await this.redis.keys('*');
      if (keysToDelete.length > 0) {
        await this.deleteMany(keysToDelete);
      }
    } catch (error) {
      this.logger.error('❌ 레디스 삭제 실패:', error);
      throw error;
    }
  }

  // Redis의 iterator 기능을 래핑 (모든 키-값 쌍 순회)
  async *iterator(): AsyncGenerator<[string, any], void, unknown> {
    try {
      const keys = await this.redis.keys('*');
      for (const key of keys) {
        const value = await this.redis.get(key);
        if (value) {
          yield [key, JSON.parse(value)];
        }
      }
    } catch (error) {
      this.logger.error('❌ 레디스 조회 실패:', error);
      throw error;
    }
  }

  // ==================== ZSET (Sorted Set) 메서드들 ====================

  /**
   * ZSET에 멤버 추가 (점수와 함께)
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      const result = await this.redis.zadd(key, score, member);
      this.logger.debug(`🐛 레디스 ZSET 추가 성공: ${key}, score: ${score}, member: ${member}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ 레디스 ZSET 추가 실패: ${key}`, error);
      throw error;
    }
  }

  /**
   * ZSET에서 멤버 제거
   */
  async zrem(key: string, member: string): Promise<number> {
    try {
      const result = await this.redis.zrem(key, member);
      this.logger.debug(`🐛 레디스 ZSET 삭제 성공: ${key}, member: ${member}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ 레디스 ZSET 삭제 실패: ${key}`, error);
      throw error;
    }
  }

  /**
   * ZSET에서 최소 점수 멤버 조회 (우선순위 큐에서 가장 오래된 멤버)
   */
  async zpopmin(key: string, count: number = 1): Promise<ZSetEntry[]> {
    try {
      // 우선순위가 가장 높은 멤버를 추출하고 제거
      const result = await this.redis.zpopmin(key, count);
      const entries: ZSetEntry[] = [];

      for (let i = 0; i < result.length; i += 2) {
        entries.push({
          member: result[i],
          score: parseFloat(result[i + 1]),
        });
      }

      this.logger.debug(`🐛 ZPOPMIN: ${key}, count: ${count}, result: ${entries.length} entries`);
      return entries;
    } catch (error) {
      this.logger.error(`❌ 레디스 ZPOPMIN 추출 실패: ${key}`, error);
      throw error;
    }
  }

  /**
   * ZSET에서 최대 점수 멤버 조회 (우선순위 큐에서 가장 최근 멤버)
   */
  async zpopmax(key: string, count: number = 1): Promise<ZSetEntry[]> {
    try {
      const result = await this.redis.zpopmax(key, count);
      const entries: ZSetEntry[] = [];

      for (let i = 0; i < result.length; i += 2) {
        entries.push({
          member: result[i],
          score: parseFloat(result[i + 1]),
        });
      }

      this.logger.debug(`ZPOPMAX: ${key}, count: ${count}, result: ${entries.length} entries`);
      return entries;
    } catch (error) {
      this.logger.error(`❌ 레디스 ZSET 추출 실패: ${key}`, error);
      throw error;
    }
  }

  /**
   * ZSET 크기 조회
   */
  async zcard(key: string): Promise<number> {
    try {
      const result = await this.redis.zcard(key);
      this.logger.debug(`ZCARD: ${key}, size: ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ 레디스 ZSET 크기 조회 실패: ${key}`, error);
      throw error;
    }
  }

  /**
   * ZSET에서 특정 멤버의 점수 조회
   */
  async zscore(key: string, member: string): Promise<number | null> {
    try {
      const result = await this.redis.zscore(key, member);
      this.logger.debug(`ZSCORE: ${key}, member: ${member}, score: ${result}`);
      return result ? parseFloat(result) : null;
    } catch (error) {
      this.logger.error(`❌ 레디스 ZSET 점수 조회 실패: ${key}`, error);
      throw error;
    }
  }

  /**
   * ZSET에서 특정 범위의 멤버들 조회 (오름차순)
   */
  async zrange(
    key: string,
    start: number = 0,
    stop: number = -1,
    withScores: boolean = false
  ): Promise<string[] | ZSetEntry[]> {
    try {
      let result: string[];

      if (withScores) {
        result = await this.redis.zrange(key, start, stop, 'WITHSCORES');
        const entries: ZSetEntry[] = [];
        for (let i = 0; i < result.length; i += 2) {
          entries.push({
            member: result[i],
            score: parseFloat(result[i + 1]),
          });
        }

        this.logger.debug(
          `🐛 ZRANGE: ${key}, start: ${start}, stop: ${stop}, withScores: true, result: ${entries.length} entries`
        );
        return entries;
      } else {
        result = await this.redis.zrange(key, start, stop);

        this.logger.debug(`🐛 ZRANGE: ${key}, start: ${start}, stop: ${stop}, result: ${result.length} members`);
        return result;
      }
    } catch (error) {
      this.logger.error(`❌ 레디스 ZSET 조회 실패: ${key}`, error);
      throw error;
    }
  }

  /**
   * ZSET에서 특정 범위의 멤버들 조회 (내림차순)
   */
  async zrevrange(
    key: string,
    start: number,
    stop: number,
    withScores: boolean = false
  ): Promise<string[] | ZSetEntry[]> {
    try {
      let result: string[];

      if (withScores) {
        result = await this.redis.zrevrange(key, start, stop, 'WITHSCORES');
        const entries: ZSetEntry[] = [];
        for (let i = 0; i < result.length; i += 2) {
          entries.push({
            member: result[i],
            score: parseFloat(result[i + 1]),
          });
        }
        this.logger.debug(
          `ZREVRANGE: ${key}, start: ${start}, stop: ${stop}, withScores: true, result: ${entries.length} entries`
        );
        return entries;
      } else {
        result = await this.redis.zrevrange(key, start, stop);
        this.logger.debug(`ZREVRANGE: ${key}, start: ${start}, stop: ${stop}, result: ${result.length} members`);
        return result;
      }
    } catch (error) {
      this.logger.error(`❌ 레디스 ZSET 조회 실패: ${key}`, error);
      throw error;
    }
  }

  /**
   * ZSET에서 특정 점수 범위의 멤버들 조회
   */
  async zrangebyscore(
    key: string,
    min: number,
    max: number,
    withScores: boolean = false
  ): Promise<string[] | ZSetEntry[]> {
    try {
      let result: string[];

      if (withScores) {
        result = await this.redis.zrangebyscore(key, min, max, 'WITHSCORES');
        const entries: ZSetEntry[] = [];
        for (let i = 0; i < result.length; i += 2) {
          entries.push({
            member: result[i],
            score: parseFloat(result[i + 1]),
          });
        }
        this.logger.debug(
          `ZRANGEBYSCORE: ${key}, min: ${min}, max: ${max}, withScores: true, result: ${entries.length} entries`
        );
        return entries;
      } else {
        result = await this.redis.zrangebyscore(key, min, max);
        this.logger.debug(`ZRANGEBYSCORE: ${key}, min: ${min}, max: ${max}, result: ${result.length} members`);
        return result;
      }
    } catch (error) {
      this.logger.error(`❌ 레디스 ZSET 조회 실패: ${key}`, error);
      throw error;
    }
  }

  /**
   * ZSET에서 특정 점수 범위의 멤버 수 조회
   */
  async zcount(key: string, min: number, max: number): Promise<number> {
    try {
      const result = await this.redis.zcount(key, min, max);
      this.logger.debug(`🐛 ZCOUNT: ${key}, min: ${min}, max: ${max}, count: ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ 레디스 ZSET 멤버 수 조회 실패: ${key}`, error);
      throw error;
    }
  }

  // ==================== 온라인 상태 관리 ====================

  /**
   * 사용자 온라인 상태 설정
   */
  async setUserOnlineStatus(userId: string, status: 'online' | 'idle' | 'away' | 'offline'): Promise<void> {
    try {
      const onlineData = {
        status,
        lastSeen: new Date().toISOString(),
        timestamp: Date.now(),
      };

      // 온라인 상태 저장 (5분 TTL)
      await this.set(`user:online:${userId}`, onlineData, 300);

      // 온라인 사용자 목록에 추가
      await this.redis.sadd('users:online', userId);

      this.logger.debug(`🐛 사용자 온라인 상태 설정: ${userId} - ${status}`);
    } catch (error) {
      this.logger.error(`❌ 사용자 온라인 상태 설정 실패: ${userId}`, error);
      throw error;
    }
  }

  /**
   * 사용자 온라인 상태 조회
   */
  async getUserOnlineStatus(userId: string): Promise<{ status: string; lastSeen: string; timestamp: number } | null> {
    try {
      const status = await this.redis.get(`user:online:${userId}`);

      return status ? JSON.parse(status) : null;
    } catch (error) {
      this.logger.error(`❌ 사용자 온라인 상태 조회 실패: ${userId}`, error);
      return null;
    }
  }

  /**
   * 여러 사용자의 온라인 상태 일괄 조회
   */
  async getUsersOnlineStatus(userIds: string[]): Promise<Record<string, any>> {
    try {
      const statuses: Record<string, any> = {};

      // 병렬로 상태 조회
      const promises = userIds.map(async userId => {
        const status = await this.getUserOnlineStatus(userId);
        return { userId, status };
      });

      const results = await Promise.all(promises);

      results.forEach(({ userId, status }) => {
        statuses[userId] = status;
      });

      this.logger.debug(`🐛 ${userIds.length}명의 온라인 상태 조회 완료`);
      return statuses;
    } catch (error) {
      this.logger.error(`❌ 사용자들 온라인 상태 조회 실패`, error);
      return {};
    }
  }

  /**
   * 사용자 오프라인 상태 설정
   */
  async setUserOffline(userId: string): Promise<void> {
    try {
      // 온라인 상태 제거
      await this.redis.del(`user:online:${userId}`);

      // 온라인 사용자 목록에서 제거
      await this.redis.srem('users:online', userId);

      this.logger.debug(`🐛 사용자 오프라인 상태 설정: ${userId}`);
    } catch (error) {
      this.logger.error(`❌ 사용자 오프라인 상태 설정 실패: ${userId}`, error);
      throw error;
    }
  }

  /**
   * 온라인 사용자 목록 조회
   */
  async getOnlineUsers(): Promise<string[]> {
    try {
      const onlineUsers = await this.redis.smembers('users:online');
      this.logger.debug(`🐛 온라인 사용자 목록 조회: ${onlineUsers.length}명`);
      return onlineUsers;
    } catch (error) {
      this.logger.error(`❌ 온라인 사용자 목록 조회 실패`, error);
      return [];
    }
  }

  /**
   * 온라인 사용자 수 조회
   */
  async getOnlineUsersCount(): Promise<number> {
    try {
      const count = await this.redis.scard('users:online');
      this.logger.debug(`🐛 온라인 사용자 수: ${count}명`);
      return count;
    } catch (error) {
      this.logger.error(`❌ 온라인 사용자 수 조회 실패`, error);
      return 0;
    }
  }

  /**
   * 사용자가 온라인인지 확인
   */
  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const status = await this.getUserOnlineStatus(userId);
      return status !== null && status.status === 'online';
    } catch (error) {
      this.logger.error(`❌ 사용자 온라인 상태 확인 실패: ${userId}`, error);
      return false;
    }
  }

  /**
   * 사용자 상태를 idle로 변경 (5분 이상 활동 없음)
   */
  async setUserIdle(userId: string): Promise<void> {
    try {
      const currentStatus = await this.getUserOnlineStatus(userId);
      if (currentStatus && currentStatus.status === 'online') {
        await this.setUserOnlineStatus(userId, 'idle');
        this.logger.debug(`🐛 사용자 상태를 idle로 변경: ${userId}`);
      }
    } catch (error) {
      this.logger.error(`❌ 사용자 상태를 idle로 변경 실패: ${userId}`, error);
    }
  }

  /**
   * 사용자 상태를 away로 변경 (30분 이상 활동 없음)
   */
  async setUserAway(userId: string): Promise<void> {
    try {
      const currentStatus = await this.getUserOnlineStatus(userId);
      if (currentStatus && (currentStatus.status === 'online' || currentStatus.status === 'idle')) {
        await this.setUserOnlineStatus(userId, 'away');
        this.logger.debug(`🐛 사용자 상태를 away로 변경: ${userId}`);
      }
    } catch (error) {
      this.logger.error(`❌ 사용자 상태를 away로 변경 실패: ${userId}`, error);
    }
  }

  /**
   * 만료된 온라인 상태 정리 (TTL 만료된 사용자들)
   */
  async cleanupExpiredOnlineStatus(): Promise<number> {
    try {
      const onlineUsers = await this.getOnlineUsers();
      let cleanedCount = 0;

      for (const userId of onlineUsers) {
        const status = await this.getUserOnlineStatus(userId);
        if (!status) {
          // 상태가 없으면 온라인 목록에서 제거
          await this.redis.srem('users:online', userId);
          cleanedCount++;
        }
      }

      this.logger.debug(`🐛 만료된 온라인 상태 정리 완료: ${cleanedCount}명`);
      return cleanedCount;
    } catch (error) {
      this.logger.error(`❌ 만료된 온라인 상태 정리 실패`, error);
      return 0;
    }
  }

  // ==================== 분산 락 (Distributed Lock) 메서드들 ====================

  /**
   * 분산 락 획득 (Redis 기반)
   */
  async acquireDistributedLock(
    lockKey: string,
    ttl: number = 5000,
    retryDelay: number = 100,
    maxRetries: number = 5
  ): Promise<boolean> {
    const fullLockKey = `lock:${lockKey}`;
    const lockValue = `${process.env.SERVER_ID || 'server'}:${process.env.PORT || '3000'}:${Date.now()}`;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // PX =>  milliseconds, milliPrefix 에서 따온 것 이라고 함
        // NX => Not eXists => 키가 없을 때만 설정
        const result = await this.redis.set(fullLockKey, lockValue, 'PX', ttl, 'NX');
        if (result === 'OK') {
          return true;
        }

        // 락 획득 실패 시 잠시 대기 후 재시도
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        this.logger.error(`❌ 분산 락 획득 실패: ${lockKey} (시도: ${attempt + 1})`, error);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    this.logger.warn(`⚠️ 분산 락 획득 실패 (최대 재시도 초과): ${lockKey}`);
    return false;
  }

  /**
   * 분산 락 해제
   */
  async releaseDistributedLock(lockKey: string): Promise<boolean> {
    const fullLockKey = `lock:${lockKey}`;

    try {
      const result = await this.redis.del(fullLockKey);
      const success = result > 0;

      if (success) {
        this.logger.debug(`🔓 분산 락 해제 성공: ${lockKey}`);
      } else {
        this.logger.warn(`⚠️ 분산 락 해제 실패 (락이 존재하지 않음): ${lockKey}`);
      }

      return success;
    } catch (error) {
      this.logger.error(`❌ 분산 락 해제 실패: ${lockKey}`, error);
      return false;
    }
  }

  /**
   * 분산 락으로 보호된 작업 실행
   */
  async runWithDistributedLock<T>(
    lockKey: string,
    operation: () => Promise<T>,
    ttl: number = 5000,
    retryDelay: number = 100,
    maxRetries: number = 5
  ): Promise<T> {
    const acquired = await this.acquireDistributedLock(lockKey, ttl, retryDelay, maxRetries);
    if (!acquired) {
      throw new Error(`분산 락 획득 실패: ${lockKey}`);
    }

    try {
      const result = await operation();
      return result;
    } finally {
      await this.releaseDistributedLock(lockKey);
    }
  }

  /**
   * 락 상태 확인
   */
  async getLockStatus(lockKey: string): Promise<{
    exists: boolean;
    value?: string;
    ttl?: number;
  }> {
    const fullLockKey = `lock:${lockKey}`;

    try {
      const value = await this.redis.get(fullLockKey);
      const ttl = await this.redis.ttl(fullLockKey);

      return {
        exists: value !== null,
        value: value || undefined,
        ttl: ttl > 0 ? ttl * 1000 : undefined, // 밀리초로 변환
      };
    } catch (error) {
      this.logger.error(`❌ 락 상태 확인 실패: ${lockKey}`, error);
      return { exists: false };
    }
  }

  /**
   * 만료된 락 정리 (데드락 방지)
   */
  async cleanupExpiredLocks(lockPrefix: string = 'lock:'): Promise<number> {
    try {
      const lockKeys = await this.redis.keys(`${lockPrefix}*`);
      let cleanedCount = 0;

      for (const lockKey of lockKeys) {
        const ttl = await this.redis.ttl(lockKey);
        // TTL이 -1 (만료되지 않음)이거나 -2 (존재하지 않음)인 경우 정리
        if (ttl === -1) {
          await this.redis.del(lockKey);
          cleanedCount++;
          this.logger.debug(`🧹 만료되지 않은 락 정리: ${lockKey}`);
        }
      }

      this.logger.debug(`🧹 만료된 락 정리 완료: ${cleanedCount}개`);
      return cleanedCount;
    } catch (error) {
      this.logger.error(`❌ 만료된 락 정리 실패`, error);
      return 0;
    }
  }
}
