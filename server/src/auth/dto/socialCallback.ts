import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SocialCallbackRequestDto {
  @ApiProperty({
    description: 'Google OAuth 코드',
  })
  @IsString({ message: '코드는 문자열이어야 합니다.' })
  code: string;
}
