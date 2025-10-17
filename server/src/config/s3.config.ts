export const s3Config = () => {
  // 필수 환경 변수 검증
  const requiredEnvVars = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "AWS_S3_BUCKET_NAME"];

  const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required S3 environment variables: ${missingEnvVars.join(", ")}`);
  }

  return {
    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "ap-northeast-2",
      bucketName: process.env.AWS_S3_BUCKET_NAME,
      bucketUrl: process.env.AWS_S3_BUCKET_URL || `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || "ap-northeast-2"}.amazonaws.com`,
    },
  };
};
