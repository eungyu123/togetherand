import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from './redis.service';

@Injectable()
export class OnlineStatusMonitorService {
  private readonly logger = new Logger(OnlineStatusMonitorService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * 5분마다 실행: 온라인 상태를 idle로 변경
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkIdleUsers(): Promise<void> {
    try {
      const onlineUsers = await this.redisService.getOnlineUsers();
      let idleCount = 0;

      for (const userId of onlineUsers) {
        const status = await this.redisService.getUserOnlineStatus(userId);
        if (status && status.status === 'online') {
          // 5분 이상 활동이 없으면 idle로 변경
          const lastActivity = new Date(status.timestamp);
          const now = new Date();
          const diffInMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

          if (diffInMinutes >= 5) {
            await this.redisService.setUserIdle(userId);
            idleCount++;
          }
        }
      }

      if (idleCount > 0) {
        this.logger.log(`🔄 ${idleCount}명의 사용자 상태를 idle로 변경`);
      }
    } catch (error) {
      this.logger.error('❌ idle 사용자 체크 실패:', error);
    }
  }

  /**
   * 30분마다 실행: idle 상태를 away로 변경
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkAwayUsers(): Promise<void> {
    try {
      const onlineUsers = await this.redisService.getOnlineUsers();
      let awayCount = 0;

      for (const userId of onlineUsers) {
        const status = await this.redisService.getUserOnlineStatus(userId);
        if (status && (status.status === 'online' || status.status === 'idle')) {
          // 30분 이상 활동이 없으면 away로 변경
          const lastActivity = new Date(status.timestamp);
          const now = new Date();
          const diffInMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

          if (diffInMinutes >= 30) {
            await this.redisService.setUserAway(userId);
            awayCount++;
          }
        }
      }

      if (awayCount > 0) {
        this.logger.log(`🔄 ${awayCount}명의 사용자 상태를 away로 변경`);
      }
    } catch (error) {
      this.logger.error('❌ away 사용자 체크 실패:', error);
    }
  }

  /**
   * 1시간마다 실행: 만료된 온라인 상태 정리
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredStatus(): Promise<void> {
    try {
      const cleanedCount = await this.redisService.cleanupExpiredOnlineStatus();

      if (cleanedCount > 0) {
        this.logger.log(`🧹 만료된 온라인 상태 ${cleanedCount}개 정리 완료`);
      }
    } catch (error) {
      this.logger.error('❌ 만료된 온라인 상태 정리 실패:', error);
    }
  }

  /**
   * 수동으로 사용자 상태 체크
   */
  async checkUserStatus(userId: string): Promise<{ status: string; lastSeen: string } | null> {
    try {
      const status = await this.redisService.getUserOnlineStatus(userId);
      return status;
    } catch (error) {
      this.logger.error(`❌ 사용자 상태 체크 실패: ${userId}`, error);
      return null;
    }
  }

  /**
   * 모든 온라인 사용자 상태 요약
   */
  async getOnlineStatusSummary(): Promise<{
    totalOnline: number;
    online: number;
    idle: number;
    away: number;
  }> {
    try {
      const onlineUsers = await this.redisService.getOnlineUsers();
      const summary = {
        totalOnline: onlineUsers.length,
        online: 0,
        idle: 0,
        away: 0,
      };

      for (const userId of onlineUsers) {
        const status = await this.redisService.getUserOnlineStatus(userId);
        if (status) {
          summary[status.status as keyof typeof summary]++;
        }
      }

      return summary;
    } catch (error) {
      this.logger.error('❌ 온라인 상태 요약 조회 실패:', error);
      return {
        totalOnline: 0,
        online: 0,
        idle: 0,
        away: 0,
      };
    }
  }
}
