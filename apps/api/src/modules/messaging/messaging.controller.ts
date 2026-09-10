import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { MessagingService } from './messaging.service';

const startConvo = z.object({ vehicleId: z.string().uuid() });
const send = z.object({ body: z.string().min(1).max(4000) });

@Controller('api/v1/messages')
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get('conversations')
  list(@CurrentUser() user: AuthUser) {
    return this.messaging.list(user.id);
  }

  @Post('conversations')
  start(@CurrentUser() user: AuthUser, @ZodBody(startConvo) body: any) {
    return this.messaging.ensureListingConversation(user.id, body.vehicleId);
  }

  @Get('conversations/:reference')
  messages(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    return this.messaging.messages(user.id, reference);
  }

  @Post('conversations/:reference/send')
  send(@CurrentUser() user: AuthUser, @Param('reference') reference: string, @ZodBody(send) body: any) {
    return this.messaging.send(user.id, reference, body.body);
  }

  @Post('conversations/:reference/read')
  read(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    return this.messaging.markRead(user.id, reference);
  }
}
