import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { PaymentPurpose } from '@hiregari/types';
import { CurrentUser, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { PaymentsService } from './payments.service';

const initiate = z.object({
  bookingRef: z.string().min(4),
  purpose: z.nativeEnum(PaymentPurpose).default(PaymentPurpose.RENTAL),
  provider: z.enum(['MPESA', 'CARD']).default('MPESA'),
  phoneE164: z
    .string()
    .regex(/^\+254[17]\d{8}$/)
    .optional(),
});

@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('mpesa')
  mpesa(@CurrentUser() user: AuthUser, @ZodBody(initiate) body: any) {
    return this.payments.initiate(user.id, { ...body, provider: 'MPESA' });
  }

  @Post('card')
  card(@CurrentUser() user: AuthUser, @ZodBody(initiate) body: any) {
    return this.payments.initiate(user.id, { ...body, provider: 'CARD' });
  }

  @Get(':reference')
  status(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    return this.payments.getStatus(user.id, reference);
  }
}
