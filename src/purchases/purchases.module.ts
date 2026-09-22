import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Purchase } from './entities/purchase.entity';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

import { Supplier } from '../suppliers/entities/supplier.entity';
import { PurchaseItem } from '../purchase-items/entities/purchase-item.entity';
import { ProductUnit } from '../product-units/entities/product-unit.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryMovement } from '../inventory-movements/entities/inventory-movement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Purchase,
      Supplier,
      PurchaseItem,
      ProductUnit,
      Inventory,
      InventoryMovement
    ]),
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}