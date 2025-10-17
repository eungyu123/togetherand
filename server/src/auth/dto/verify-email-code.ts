import { IsEmail, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 이메일 인증 코드 검증 요청 DTO
 *
 * - email: string
 * - verifyCode: string
 */
export class VerifyEmailCodeRequestDto {
  @ApiProperty({
    description: '이메일',
    example: 'beg4660@naver.com',
  })
  @IsString({ message: '이메일은 문자열이어야 합니다.' })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;

  @ApiProperty({
    description: '인증 코드',
    example: '123456',
  })
  @IsString({ message: '인증 코드는 문자열이어야 합니다.' })
  verifyCode: string;
}

export class VerifyEmailCodeResponseDto {}
