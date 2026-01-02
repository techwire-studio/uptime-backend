import { env } from '@/configs/env';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY
  }
});

export const uploadFile = async (
  file: Express.Multer.File,
  keyName: string
): Promise<string> => {
  try {
    if (!file?.buffer) {
      throw new Error('Invalid file buffer');
    }

    const command = new PutObjectCommand({
      Bucket: 'status-page-images',
      Key: keyName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read'
    });

    await s3Client.send(command);

    return `https://${'status-page-images'}.s3.${env.AWS_REGION}.amazonaws.com/${keyName}`;
  } catch (error) {
    console.error('S3 upload failed:', error);
    throw {
      statusCode: 500,
      message: 'Failed to upload image'
    };
  }
};
