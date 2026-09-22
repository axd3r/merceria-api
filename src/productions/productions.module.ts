import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductionsController } from './productions.controller';

import { ProductionsService } from './productions.service';

import { Production } from './entities/production.entity';

import { ProductionTask } from '../production-tasks/entities/production-task.entity';

import { Order } from '../orders/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Production, ProductionTask, Order])],
  controllers: [ProductionsController],
  providers: [ProductionsService],
})
export class ProductionsModule {}
