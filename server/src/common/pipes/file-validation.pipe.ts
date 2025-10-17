import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";

@Injectable()
export class FileValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException("❌ 파일이 제공되지 않았습니다.");
    }

    // 파일 크기 검증 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(`❌ 파일 크기가 제한을 초과했습니다. 최대 크기: ${maxSize / 1024 / 1024}MB`);
    }

    // 파일 타입 검증
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png", 
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`❌ 허용되지 않는 파일 타입입니다. 허용된 타입: ${allowedMimeTypes.join(", ")}`);
    }

    return file;
  }
} 