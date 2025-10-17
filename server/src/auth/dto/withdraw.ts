import { ApiProperty } from '@nestjs/swagger';

export class WithdrawRequestDto {}

export class WithdrawResponseDto {
  @ApiProperty({
    description: '탈퇴 성공 여부',
    example: true,
  })
  deleted: boolean;

  @ApiProperty({
    description: '탈퇴된 사용자 이메일',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: '탈퇴 완료 시간',
    example: '2024-01-01 12:00:00',
  })
  deletedAt: string;
}
