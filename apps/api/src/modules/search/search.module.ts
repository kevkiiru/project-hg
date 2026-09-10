import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [VehiclesModule, IntegrationsModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
