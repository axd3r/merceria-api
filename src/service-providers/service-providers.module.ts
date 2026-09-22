import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ServiceProvidersController } from './service-providers.controller';

import { ServiceProvidersService } from './service-providers.service';

import { ServiceProvider } from './entities/service-provider.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceProvider,
    ]),
  ],
  controllers: [
    ServiceProvidersController,
  ],
  providers: [
    ServiceProvidersService,
  ],
})
export class ServiceProvidersModule {}