import { BadRequestException, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly bucketUrl: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>("s3.region");
    const accessKeyId = this.configService.get<string>("s3.accessKeyId");
    const secretAccessKey = this.configService.get<string>("s3.secretAccessKey");

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error("❌ S3 설정이 완료되지 않았습니다.");
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const bucketName = this.configService.get<string>("s3.bucketName");
    const bucketUrl = this.configService.get<string>("s3.bucketUrl");

    if (!bucketName || !bucketUrl) {
      throw new Error("❌ S3 버킷 설정이 완료되지 않았습니다.");
    }

    this.bucketName = bucketName;
    this.bucketUrl = bucketUrl;
  }

  /**
   * 파일을 S3에 업로드
   */
  async uploadFile(file: Express.Multer.File, folder: string = "uploads"): Promise<string> {
    try {
      const fileName = `${folder}/${Date.now()}-${file.originalname}`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        // ACL: "public-read", // acl 정책 설정 
      });

      await this.s3Client.send(command);
      
      const fileUrl = `${this.bucketUrl}/${fileName}`;
      this.logger.log(`✅ 파일이 업로드 되었습니다. : ${fileUrl}`);
      
      return fileUrl;
    } catch (error) {
      this.logger.error(`❌ 파일 업로드를 실패했습니다. : ${error.message}`);
      throw new InternalServerErrorException("❌ 파일 업로드를 실패했습니다.", { cause: error });
    }
  }

  /**
   * S3에서 파일 삭제
   */
  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      const key = fileUrl.replace(`${this.bucketUrl}/`, "");
      
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      
      this.logger.log(`✅ 파일이 삭제되었습니다. : ${fileUrl}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ 파일 삭제를 실패했습니다. : ${error.message}`);
      throw new InternalServerErrorException("❌ 파일 삭제를 실패했습니다.", { cause: error });
    }
  }

  /**
   * 파일의 서명된 URL 생성 (임시 접근용)
   */
  async getSignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
    try {
      const key = fileUrl.replace(`${this.bucketUrl}/`, "");
      
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      
      this.logger.log(`✅ 서명된 URL이 생성되었습니다. : ${signedUrl}`);
      return signedUrl;
    } catch (error) {
      this.logger.error(`❌ 서명된 URL 생성을 실패했습니다. : ${error.message}`);
      throw new InternalServerErrorException("❌ 서명된 URL 생성을 실패했습니다.", { cause: error });
    }
  }

}
