// pre
import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  UsePipes,
  UseFilters,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { S3Service } from './s3.service';
import { ResponseDto } from '../common/dto/common.dto';
import { getKoreanTimeFormatted } from '../common/utils/date.util';
import { FileValidationPipe } from '../common/pipes/file-validation.pipe';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

@ApiTags('s3')
@Controller('s3')
@UseFilters(HttpExceptionFilter)
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @ApiOperation({ summary: '파일 업로드' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '업로드할 파일',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: '✅ 파일 업로드 성공' })
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(FileValidationPipe) // 파일 검증
  async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<ResponseDto<{ fileUrl: string }>> {
    // S3에 업로드
    const fileUrl = await this.s3Service.uploadFile(file);

    return {
      success: true,
      message: '✅ 파일 업로드에 성공했습니다.',
      data: { fileUrl },
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiOperation({ summary: '파일 삭제' })
  @ApiResponse({ status: 200, description: '✅ 파일 삭제 성공' })
  @Delete('delete')
  @HttpCode(HttpStatus.OK)
  async deleteFile(@Param('fileUrl') fileUrl: string): Promise<ResponseDto<{ deleted: boolean }>> {
    const deleted = await this.s3Service.deleteFile(fileUrl);

    return {
      success: true,
      message: '✅ 파일 삭제에 성공했습니다.',
      data: { deleted },
      timestamp: getKoreanTimeFormatted(),
    };
  }

  @ApiOperation({ summary: '서명된 URL 생성' })
  @ApiResponse({ status: 200, description: '✅ 서명된 URL 생성 성공' })
  @Get('signed-url/:fileUrl')
  @HttpCode(HttpStatus.OK)
  async getSignedUrl(@Param('fileUrl') fileUrl: string): Promise<ResponseDto<{ signedUrl: string }>> {
    const signedUrl = await this.s3Service.getSignedUrl(fileUrl);

    return {
      success: true,
      message: '✅ 서명된 URL 생성에 성공했습니다.',
      data: { signedUrl },
      timestamp: getKoreanTimeFormatted(),
    };
  }
}
