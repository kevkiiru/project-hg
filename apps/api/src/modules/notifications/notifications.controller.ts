import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Permission } from '@hiregari/types';
import { CurrentUser, RequirePermission } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { NotificationsService } from './notifications.service';

@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.svc.list(user.id, page ? Number(page) : 1, pageSize ? Number(pageSize) : 20);
  }

  @Patch(':id/read')
  read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.markRead(user.id, id);
  }

  @Get('preferences')
  preferences() {
    return { email: true, sms: true, push: false, whatsapp: false };
  }
}
