import { createHmac } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../core/config/config';
import { badRequest } from '../core/http/errors';

export type Bucket = 'private' | 'public';

export interface SignedUpload {
  uploadUrl: string;
  method: 'PUT' | 'POST';
  headers: Record<string, string>;
  objectKey: string;
  publicUrl?: string;
  expiresAt: Date;
}

export interface StoragePort {
  presignPut(args: {
    bucket: Bucket;
    objectKey: string;
    contentType: string;
    maxBytes: number;
  }): Promise<SignedUpload>;
  presignGet(bucket: Bucket, objectKey: string, ttlSeconds?: number): Promise<string>;
  publicUrl(objectKey: string): string | null;
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function sign(payload: string): string {
  return createHmac('sha256', config().SESSION_SECRET).update(payload).digest('hex');
}

/** HMAC token used by the LOCAL adapter for self-signed put/get URLs. */
export function makeLocalStorageToken(action: 'put' | 'get', bucket: Bucket, key: string, expiresAt: number): string {
  const body = `${action}.${bucket}.${key}.${expiresAt}`;
  return `${Buffer.from(body).toString('base64url')}.${sign(body)}`;
}

export function verifyLocalStorageToken(action: 'put' | 'get', token: string): {
  bucket: Bucket;
  key: string;
  expiresAt: number;
} {
  const [bodyB64, sig] = token.split('.');
  if (!bodyB64 || !sig) throw badRequest('STORAGE_TOKEN_INVALID', 'Invalid file link.');
  const body = Buffer.from(bodyB64, 'base64url').toString();
  const [act, bucket, key, expStr] = body.split('.');
  if (!act || !bucket || !key || !expStr) throw badRequest('STORAGE_TOKEN_INVALID', 'Invalid file link.');
  const expected = sign(body);
  if (sig.length !== expected.length) throw badRequest('STORAGE_TOKEN_INVALID', 'Invalid file link.');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !a.equals(b)) throw badRequest('STORAGE_TOKEN_INVALID', 'Invalid file link.');
  if (act !== action) throw badRequest('STORAGE_TOKEN_INVALID', 'Link type mismatch.');
  const expiresAt = Number(expStr);
  if (Date.now() > expiresAt) throw badRequest('STORAGE_TOKEN_EXPIRED', 'This upload link has expired.');
  return { bucket: bucket as Bucket, key, expiresAt };
}

export function validateUploadContentType(contentType: string) {
  if (!ALLOWED_MIME.includes(contentType)) {
    throw badRequest(
      'UPLOAD_REJECTED',
      'You can upload JPEG, PNG, WebP images or PDF documents only.',
    );
  }
}

export class LocalStorageAdapter implements StoragePort {
  constructor(private readonly root: string, private readonly apiBase: string) {}

  async presignPut({ bucket, objectKey, contentType }: any): Promise<SignedUpload> {
    validateUploadContentType(contentType);
    const expiresAt = Date.now() + config().SIGNED_URL_TTL_SECONDS * 1000;
    const token = makeLocalStorageToken('put', bucket, objectKey, expiresAt);
    return {
      uploadUrl: `${this.apiBase}/api/v1/storage/ingest?token=${token}`,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      objectKey,
      publicUrl: bucket === 'public' ? `${this.apiBase}/storage/public/${objectKey}` : undefined,
      expiresAt: new Date(expiresAt),
    };
  }

  async presignGet(bucket: Bucket, objectKey: string, ttlSeconds = 300): Promise<string> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const token = makeLocalStorageToken('get', bucket, objectKey, expiresAt);
    return `${this.apiBase}/api/v1/storage/object?token=${token}`;
  }

  publicUrl(objectKey: string): string {
    return `${this.apiBase}/storage/public/${objectKey}`;
  }
}

export class S3StorageAdapter implements StoragePort {
  private readonly client: S3Client;
  constructor() {
    const c = config();
    this.client = new S3Client({
      region: c.S3_REGION,
      endpoint: c.S3_ENDPOINT,
      forcePathStyle: !!c.S3_ENDPOINT,
      credentials:
        c.S3_ACCESS_KEY_ID && c.S3_SECRET_ACCESS_KEY
          ? { accessKeyId: c.S3_ACCESS_KEY_ID, secretAccessKey: c.S3_SECRET_ACCESS_KEY }
          : undefined,
    });
  }

  private bucketName(b: Bucket) {
    return b === 'private' ? config().S3_BUCKET_PRIVATE : config().S3_BUCKET_PUBLIC;
  }

  async presignPut({ bucket, objectKey, contentType }: any): Promise<SignedUpload> {
    validateUploadContentType(contentType);
    const command = new PutObjectCommand({
      Bucket: this.bucketName(bucket),
      Key: objectKey,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: config().SIGNED_URL_TTL_SECONDS,
    });
    return {
      uploadUrl: url,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      objectKey,
      publicUrl:
        bucket === 'public'
          ? `${this.client.config.endpoint ? '' : ''}https://${this.bucketName('public')}.s3.${config().S3_REGION}.amazonaws.com/${objectKey}`
          : undefined,
      expiresAt: new Date(Date.now() + config().SIGNED_URL_TTL_SECONDS * 1000),
    };
  }

  async presignGet(bucket: Bucket, objectKey: string, ttlSeconds = 300): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucketName(bucket), Key: objectKey }),
      { expiresIn: ttlSeconds },
    );
  }

  publicUrl(objectKey: string): string {
    return `https://${this.bucketName('public')}.s3.${config().S3_REGION}.amazonaws.com/${objectKey}`;
  }
}

export function createStorage(): StoragePort {
  const c = config();
  return c.STORAGE_DRIVER === 's3' ? new S3StorageAdapter() : new LocalStorageAdapter(c.STORAGE_LOCAL_PATH, c.API_BASE_URL);
}
