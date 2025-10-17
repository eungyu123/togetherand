import { HttpException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SendMailRequestDto } from './dto/send-mail.dto';
import * as nodemailer from 'nodemailer';

/**
 * 메일 서비스
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // SMTP 트랜스포터 초기화
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.MAIL_PORT || '587', 10),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  /**
   * 일반 이메일 발송
   */
  async sendMail(sendMailDto: SendMailRequestDto): Promise<boolean> {
    try {
      this.logger.log(`Sending email to: ${sendMailDto.to}`);

      // 이메일 발송 옵션 설정
      const mailOptions = {
        from: process.env.MAIL_FROM || process.env.MAIL_USER,
        to: sendMailDto.to,
        subject: sendMailDto.subject,
        html: sendMailDto.html,
        text: sendMailDto.text,
      };

      // 이메일 발송
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`메일 전송 성공: ${info.messageId}`);
      // Ethereal이 아닌 Gmail, Naver, SMTP 같은 실제 서비스로 보낸 경우에는 null을 반환합니다. 즉 현재는 실제 google 메일을 이용함으로 null을 반환
      // this.logger.log(`메일 미리보기 URL: ${nodemailer.getTestMessageUrl(info)}`);

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('메일 전송 실패', { cause: error });
    }
  }
}
