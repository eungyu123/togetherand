import { fetchWithAuth } from './common';

// 서버 응답 타입 정의
// interface S3UploadResponse {
//   success: boolean;
//   message: string;
//   data: {
//     fileUrl: string;
//   };
//   timestamp: string;
// }

/**
 * S3 파일 업로드
 */
export const s3 = {
  uploadFileToS3: async (blob: Blob, filename: string = 'file.png') => {
    const formData = new FormData();
    formData.append('file', blob, filename); // 서버의 FileInterceptor("file")와 매칭

    // 파일 업로드 시에는 Content-Type 헤더를 설정하지 않음
    // 브라우저가 자동으로 multipart/form-data와 boundary를 설정
    // 하지만 인증 토큰은 포함
    const res = await fetchWithAuth(
      `${process.env.NEXT_PUBLIC_API_URL}/api/s3/upload`,
      {
        method: 'POST',
        body: formData,
      },
      { isFileUpload: true }
    );

    return res.json();
  },
};
