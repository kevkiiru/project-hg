import { Controller, Get } from '@nestjs/common';
import { Dto } from '@hiregari/types';
import { Public, ZodQueryParams } from '../../core/http/decorators';
import { SearchService } from './search.service';

@Controller('api/v1/vehicles')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Public()
  @Get('search')
  query(@ZodQueryParams(Dto.searchVehiclesQuery) query: any) {
    return this.search.search(query);
  }
}
