import { Injectable, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../redis/redis.service';
import { SKIP_CACHE_KEY } from '../decorators/skip-cache.decorator';

@Injectable()
export class CustomCacheInterceptor {
  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    // 요청 전 처리 (로깅, 인증 체크 등)
    this.beforeRequest(context);

    // SkipCache 데코레이터가 있으면 캐싱하지 않음
    const skipCache = this.reflector.get<boolean>(SKIP_CACHE_KEY, context.getHandler());

    if (skipCache) {
      return next.handle();
    }

    // 캐시 키 생성 (나중에 캐싱 기능 추가 시 사용)
    const cacheKey = this.generateCacheKey(context);

    // TODO: 캐싱 로직 추가 예정
    // const cachedData = await this.redisService.get(cacheKey);
    // if (cachedData) {
    //   return of(cachedData);
    // }

    // 요청 실행
    return next
      .handle()
      .pipe
      // TODO: 응답 후 처리 (캐싱, 로깅 등)
      // tap(async data => {
      //   await this.redisService.set(cacheKey, data, 300);
      // })
      ();
  }

  /**
   * 요청 전 처리 로직
   * @param context 실행 컨텍스트
   */
  private beforeRequest(context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;

    // TODO: 요청 로깅, 인증 체크, 레이트 리미팅 등
    // console.log(`[${new Date().toISOString()}] ${method} ${url} from ${ip}`);
  }

  /**
   * 캐시 키 생성
   * @param context 실행 컨텍스트
   * @returns 캐시 키
   */
  private generateCacheKey(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // GET 요청만 캐싱 대상
    if (method !== 'GET') {
      return '';
    }

    // URL과 쿼리 파라미터를 포함한 캐시 키 생성
    const queryString = new URLSearchParams(request.query).toString();
    const cacheKey = `cache:${method}:${url}${queryString ? `?${queryString}` : ''}`;

    return cacheKey;
  }
}
