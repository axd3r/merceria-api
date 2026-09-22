import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductionMaterialsController } from './production-materials.controller';

import { ProductionMaterialsService } from './production-materials.service';

import { ProductionMaterial } from './entities/production-material.entity';

import { Production } from '../productions/entities/production.entity';

import { ProductUnit } from '../product-units/entities/product-unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductionMaterial, Production, ProductUnit]),
  ],
  controllers: [ProductionMaterialsController],
  providers: [ProductionMaterialsService],
})
export class ProductionMaterialsModule {}
