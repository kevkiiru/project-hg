import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { StorageController } from './storage.controller';

@Module({
  imports: [IntegrationsModule],
  controllers: [StorageController],
})
export class StorageModule {}
