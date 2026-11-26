import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type StorageBackend = 'supabase' | 's3';

export function getStorageBackend(): StorageBackend {
  return process.env.LICENSE_STORAGE === 's3' ? 's3' : 'supabase';
}

function getBucket(): string {
  return process.env.LICENSE_STORAGE_BUCKET || 'releases';
}

function createS3Client(): S3Client {
  return new S3Client({
    region: process.env.LICENSE_S3_REGION || 'ir-thr-at1',
    endpoint: process.env.LICENSE_S3_ENDPOINT || 'https://s3.ir-thr-at1.arvanstorage.ir',
    forcePathStyle: process.env.LICENSE_S3_PATH_STYLE !== 'false',
    credentials: {
      accessKeyId: process.env.LICENSE_S3_KEY || '',
      secretAccessKey: process.env.LICENSE_S3_SECRET || '',
    },
  });
}

export async function uploadReleaseFile(
  path: string,
  buffer: Buffer,
  contentType = 'application/octet-stream',
): Promise<void> {
  if (getStorageBackend() === 's3') {
    const s3 = createS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.LICENSE_S3_BUCKET!,
        Key: path,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(getBucket()).upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }
}

export async function deleteReleaseFile(path: string): Promise<void> {
  if (getStorageBackend() === 's3') {
    const s3 = createS3Client();
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.LICENSE_S3_BUCKET!,
        Key: path,
      }),
    );
    return;
  }

  const supabase = createAdminClient();
  await supabase.storage.from(getBucket()).remove([path]);
}

export async function statAndHashReleaseObject(key: string): Promise<{ size: number; sha256: string } | null> {
  if (getStorageBackend() === 's3') {
    const s3 = createS3Client();
    const bucket = process.env.LICENSE_S3_BUCKET!;
    try {
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const bytes = await obj.Body?.transformToByteArray();
      if (!bytes) return null;
      const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      return { size: Number(head.ContentLength ?? bytes.length), sha256 };
    } catch {
      return null;
    }
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(getBucket()).download(key);
  if (error || !data) return null;
  const buf = Buffer.from(await data.arrayBuffer());
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  return { size: buf.length, sha256 };
}

export async function createSignedReleaseUrl(filePath: string): Promise<string> {
  const ttlMinutes = Number(process.env.LICENSE_S3_URL_TTL ?? 10);
  const filename = filePath.split('/').pop() || 'release.bin';

  if (getStorageBackend() === 's3') {
    const s3 = createS3Client();
    const cmd = new GetObjectCommand({
      Bucket: process.env.LICENSE_S3_BUCKET!,
      Key: filePath,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    });
    return await getSignedUrl(s3, cmd, { expiresIn: ttlMinutes * 60 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(getBucket())
    .createSignedUrl(filePath, ttlMinutes * 60, { download: filename });

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL generation failed: ${error?.message ?? 'unknown'}`);
  }
  return data.signedUrl;
}
