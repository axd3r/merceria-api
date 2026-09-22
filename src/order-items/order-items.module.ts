import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrderItemsService } from './order-items.service';
import { OrderItemsController } from './order-items.controller';

import { OrderItem } from './entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { ProductUnit } from '../product-units/entities/product-unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderItem,
      Order,
      ProductUnit,
    ]),
  ],
  controllers: [
    OrderItemsController,
  ],
  providers: [
    OrderItemsService,
  ],
})
export class OrderItemsModule {}