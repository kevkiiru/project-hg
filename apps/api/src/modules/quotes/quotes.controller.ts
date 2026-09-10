import { Controller, Get, Param, Post } from '@nestjs/common';
import { Dto } from '@hiregari/types';
import { CurrentUser, ZodBody } from '../../core/http/decorators';
import type { AuthUser } from '../../core/http/types';
import { QuotesService } from './quotes.service';

@Controller('api/v1/quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @ZodBody(Dto.createQuote) body: any) {
    return this.quotes.create(user.id, body);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotes.getActive(id, user.id);
  }
}
