import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductUnit } from './entities/product-unit.entity';

import { Product } from '../products/entities/product.entity';
import { Unit } from '../units/entities/unit.entity';

import { ProductUnitsController } from './product-units.controller';
import { ProductUnitsService } from './product-units.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductUnit,
      Product,
      Unit,
    ]),
  ],
  controllers: [ProductUnitsController],
  providers: [ProductUnitsService],
})
export class ProductUnitsModule {}