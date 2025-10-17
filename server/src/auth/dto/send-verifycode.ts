import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 이메일 인증 코드 전송 요청 DTO
 *
 * - email: string
 */
export class SendVerifyCodeRequestDto {
  @ApiProperty({
    description: '이메일',
    example: 'beg4660@naver.com',
  })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;
}

export class SendVerifyCodeResponseDto {}
