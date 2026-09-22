import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductionTasksController } from './production-tasks.controller';

import { ProductionTasksService } from './production-tasks.service';

import { ProductionTask } from './entities/production-task.entity';

import { Production } from '../productions/entities/production.entity';

import { ServiceProvider } from '../service-providers/entities/service-provider.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductionTask,
      Production,
      ServiceProvider,
    ]),
  ],
  controllers: [
    ProductionTasksController,
  ],
  providers: [
    ProductionTasksService,
  ],
})
export class ProductionTasksModule {}