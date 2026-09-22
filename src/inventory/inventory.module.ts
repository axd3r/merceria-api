import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Inventory } from './entities/inventory.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

import { ProductUnit } from '../product-units/entities/product-unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inventory,
      ProductUnit,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}