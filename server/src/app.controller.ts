import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ResponseDto } from './common/dto/common.dto';
import { ApiErrorResponse } from './common/decorator/api-error-response.decorator';
/**
 * AppController - NestJS 컨트롤러 클래스
 */
@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: '기본 스웨거 설명' })
  @ApiResponse({
    status: 200,
    description: 'success, message, timestamp는 필수 필드, data에 해당 API의 응답 데이터를 입력',
    type: ResponseDto<string>,
  })
  @ApiErrorResponse(
    0,
    'status, message, error에 추가하여 success, timestamp 필드 추가, 다른 스웨거 문서에는 에러 응답값 존재하지않음',
    ''
  )
  @Get()
  getHello(): ResponseDto<string> {
    return {
      success: true,
      message: 'Hello World!',
      data: this.appService.getHello(),
      timestamp: new Date().toISOString(),
    };
  }

  @ApiOperation({ summary: '헬스 체크' })
  @ApiResponse({
    status: 200,
    description: '서비스 상태 확인',
    type: ResponseDto<string>,
  })
  @Get('health')
  healthCheck(): ResponseDto<string> {
    return {
      success: true,
      message: 'Service is healthy',
      data: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
