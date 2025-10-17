import { IsEmail, IsString, IsOptional } from 'class-validator';
export class SendMailRequestDto {
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요.' })
  to: string;

  @IsString({ message: '제목은 문자열이어야 합니다.' })
  subject: string;

  @IsOptional()
  @IsString({ message: 'HTML 내용은 문자열이어야 합니다.' })
  html?: string;

  @IsOptional()
  @IsString({ message: '텍스트 내용은 문자열이어야 합니다.' })
  text?: string;
}
