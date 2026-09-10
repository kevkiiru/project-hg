import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../core/http/decorators';
import { LocationsService } from './locations.service';

@Controller('api/v1/locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Public()
  @Get('suggested')
  suggested() {
    return this.locations.suggested();
  }

  @Public()
  @Get()
  all() {
    return this.locations.all();
  }

  @Public()
  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    return this.locations.bySlug(slug);
  }
}
