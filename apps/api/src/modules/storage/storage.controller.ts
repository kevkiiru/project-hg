import { Controller, Get, Inject, Post, Query, Req, Res } from '@nestjs/common';
import { z } from 'zod';
import { createWriteStream, existsSync, mkdirSync, statSync, createReadStream } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { CurrentUser, Public, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { STORAGE } from '../../integrations/integrations.module';
import type { StoragePort, Bucket } from '../../integrations/storage';
import { config } from '../../core/config/config';
import { AppError, badRequest, notFound } from '../../core/http/errors';

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB: vehicle images and licence docs
const signUpload = z.object({
  bucket: z.enum(['private', 'public']).default('private'),
  kind: z.enum(['avatar', 'vehicle', 'document', 'inspection', 'damage', 'misc']).default('misc'),
  contentType: z.string().min(4).max(120),
  fileName: z.string().min(1).max(200).optional(),
});
const signGet = z.object({
  bucket: z.enum(['private', 'public']),
  objectKey: z.string().min(1).max(400),
});

@Controller('api/v1/storage')
export class StorageController {
  constructor(@Inject(STORAGE) private readonly storage: StoragePort) {}

  @Post('sign-upload')
  async signUpload(@CurrentUser() user: AuthUser, @ZodBody(signUpload) body: z.infer<typeof signUpload>) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(body.contentType)) {
      throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, WebP images and PDF documents are allowed.');
    }
    const extByMime: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    };
    const requestedExt = body.fileName ? extname(body.fileName).replace(/^\./, '').slice(0, 5) : '';
    const ext = requestedExt || extByMime[body.contentType];
    const objectKey = `${body.kind}/${user.id}/${randomUUID()}.${ext}`;
    const signed = await this.storage.presignPut({
      bucket: body.bucket as Bucket,
      objectKey,
      contentType: body.contentType,
      maxBytes: MAX_UPLOAD_BYTES,
    });
    return { ...signed, maxBytes: MAX_UPLOAD_BYTES };
  }

  @Post('sign-get')
  async signGet(@CurrentUser() _user: AuthUser, @ZodBody(signGet) body: z.infer<typeof signGet>) {
    const url = await this.storage.presignGet(body.bucket, body.objectKey);
    return { url, expiresInSeconds: config().SIGNED_URL_TTL_SECONDS };
  }

  @Public()
  @Get('object')
  async object(@Query('token') token: string, @Res() res: Response) {
    const { verifyLocalStorageToken } = await import('../../integrations/storage');
    const verified = verifyLocalStorageToken('get', token);
    const root = normalize(join(config().STORAGE_LOCAL_PATH, verified.bucket));
    const path = normalize(join(root, verified.key));
    if (!path.startsWith(root)) throw badRequest('BAD_KEY', 'Invalid object key.');
    if (!existsSync(path)) throw notFound('File');
    const stat = statSync(path);
    res.setHeader('Content-Length', stat.size);
    res.setHeader(
      'Cache-Control',
      verified.bucket === 'public' ? 'public, max-age=31536000, immutable' : 'private, max-age=300',
    );
    createReadStream(path).pipe(res);
  }

  /**
   * PUT /api/v1/storage/ingest?token=… is wired directly on the express
   * instance in main.ts (raw streaming; no JSON body parser).
   */
  async handleIngestPut(req: Request, res: Response) {
    const token = String(req.query.token ?? '');
    const { verifyLocalStorageToken } = await import('../../integrations/storage');
    let verified: { bucket: Bucket; key: string };
    try {
      verified = verifyLocalStorageToken('put', token);
    } catch {
      res.status(400).json({ error: { code: 'STORAGE_TOKEN_INVALID', message: 'Invalid or expired upload link.' } });
      return;
    }
    const contentType = String(req.headers['content-type'] ?? '').split(';')[0]!.trim();
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(contentType)) {
      res.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Unsupported content type.' } });
      return;
    }
    const length = Number(req.headers['content-length'] ?? 0);
    if (length && length > MAX_UPLOAD_BYTES) {
      res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'Maximum file size is 15 MB.' } });
      return;
    }

    const root = normalize(join(config().STORAGE_LOCAL_PATH, verified.bucket));
    const dest = normalize(join(root, verified.key));
    if (!dest.startsWith(root)) {
      res.status(400).json({ error: { code: 'BAD_KEY', message: 'Invalid object key.' } });
      return;
    }
    mkdirSync(join(dest, '..'), { recursive: true });

    let bytes = 0;
    let aborted = false;
    const out = createWriteStream(dest);
    req.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_UPLOAD_BYTES && !aborted) {
        aborted = true;
        out.destroy();
        req.destroy();
        if (!res.headersSent) {
          res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'Maximum file size is 15 MB.' } });
        }
      }
    });
    await new Promise<void>((resolve, reject) => {
      out.on('finish', resolve);
      out.on('error', reject);
      req.on('aborted', () => reject(new Error('client aborted')));
      req.pipe(out);
    }).catch(() => {
      /* aborted upload already answered */
    });
    if (!aborted && !res.headersSent) {
      res.status(201).json({ ok: true, objectKey: verified.key, bytes });
    }
  }
}
