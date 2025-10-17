import { ApiProperty } from "@nestjs/swagger";

export class ErrorResponseDto {
  @ApiProperty({
    description: "에러 상태 코드",
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: "에러 메시지",
    example: "존재하지 않는 이메일입니다.",
  })
  message: string;

  @ApiProperty({
    description: "에러 타입",
    example: "Bad Request",
  })
  error: string;

  @ApiProperty({
    description: "응답 시간",
    example: "2024-01-01T00:00:00.000Z",
  })
  timestamp: string;
}
