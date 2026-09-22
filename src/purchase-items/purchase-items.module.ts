import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PurchaseItem } from './entities/purchase-item.entity';
import { PurchaseItemsController } from './purchase-items.controller';
import { PurchaseItemsService } from './purchase-items.service';

import { Purchase } from '../purchases/entities/purchase.entity';
import { ProductUnit } from '../product-units/entities/product-unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseItem,
      Purchase,
      ProductUnit,
    ]),
  ],
  controllers: [PurchaseItemsController],
  providers: [PurchaseItemsService],
})
export class PurchaseItemsModule {}