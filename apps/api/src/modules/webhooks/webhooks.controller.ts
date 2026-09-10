import { Controller, Headers, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentProvider } from '@hiregari/types';
import { Public } from '../../core/http/decorators';
import { WebhooksService } from './webhooks.service';

@Controller('api/v1/webhooks/payments')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  private body(req: Request): string {
    const raw = (req as any).rawBody;
    if (Buffer.isBuffer(raw)) return raw.toString('utf8');
    if (typeof raw === 'string' && raw.length) return raw;
    return JSON.stringify(req.body ?? {});
  }

  @Public()
  @Post('mpesa')
  async mpesa(@Req() req: Request, @Res() res: Response, @Headers() headers: Record<string, string>) {
    const result = await this.webhooks.receive(PaymentProvider.MPESA, headers, this.body(req));
    // Providers expect 200 quickly; processing is synchronous here (small MVP)
    return res.status(result.accepted ? 200 : 400).json(result);
  }

  @Public()
  @Post('card')
  async card(@Req() req: Request, @Res() res: Response, @Headers() headers: Record<string, string>) {
    const result = await this.webhooks.receive(PaymentProvider.CARD, headers, this.body(req));
    return res.status(result.accepted ? 200 : 400).json(result);
  }
}
