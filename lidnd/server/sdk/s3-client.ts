import { S3Client } from "@aws-sdk/client-s3";

// AWS_ENDPOINT_URL is set in dev/test mode to point at the local
// S3-compatible MinIO container instead of real AWS - see docker-compose.yml
// and .env.development.example. forcePathStyle is required for MinIO
// (it doesn't support virtual-hosted-style bucket addressing).
export function createS3Client() {
  const endpoint = process.env.AWS_ENDPOINT_URL;
  return new S3Client({
    region: process.env.AWS_REGION,
    endpoint,
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}
