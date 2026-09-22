import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

import { Order } from './entities/order.entity';
import { OrderItem } from '../order-items/entities/order-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryMovement } from '../inventory-movements/entities/inventory-movement.entity';
import { Payment } from '../payments/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Customer,
      Quote,
      Inventory,
      InventoryMovement,
      Payment,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
