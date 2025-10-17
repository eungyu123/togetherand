// const info = await this.transporter.sendMail(mailOptions);
export const info = {
  // 받는 사람
  accepted: ["beg4660@naver.com"],
  // 거절된 사람
  rejected: [],
  // SMTP 서버가 지원하는 기능들
  ehlo: ["SIZE 36700160", "8BITMIME", "AUTH LOGIN PLAIN XOAUTH2 PLAIN-CLIENTTOKEN OAUTHBEARER XOAUTH", "ENHANCEDSTATUSCODES", "PIPELINING", "CHUNKING", "SMTPUTF8"],
  // SMTP envelope 송신에 걸린 시간
  envelopeTime: 683,
  // 메시지 본문 전송에 걸린 시간 (ms)
  messageTime: 630,
  // 메일 크기 (bytes)
  messageSize: 337,
  // SMTP 서버 응답 메시지
  response: "250 2.0.0 OK  1751811805 d2e1a72fcca58-74ce42a3150sm6638582b3a.139 - gsmtp",
  // 메일 전송 정보
  envelope: {
    from: "vmflsxm100@gmail.com",
    to: ["beg4660@naver.com"],
  },
  // 메일의 유일한 식별자, 메일서버가 자동 생성
  messageId: "<0bd37f79-7bb5-99d9-f1bc-06e3ed321d51@gmail.com>",
};
