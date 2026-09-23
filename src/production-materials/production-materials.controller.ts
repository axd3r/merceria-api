import { ParseUUIDPipe } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { ProductionMaterialsService } from './production-materials.service';

import { CreateProductionMaterialDto } from './dto/create-production-material.dto';

import { UpdateProductionMaterialDto } from './dto/update-production-material.dto';

@ApiBearerAuth()
@Roles('ADMIN')
@Controller('production-materials')
export class ProductionMaterialsController {
  constructor(
    private readonly productionMaterialsService: ProductionMaterialsService,
  ) {}

  @Roles('ADMIN', 'STAFF')
  @Post()
  create(
    @Body()
    createProductionMaterialDto: CreateProductionMaterialDto,
  ) {
    return this.productionMaterialsService.create(createProductionMaterialDto);
  }

  @Roles('ADMIN', 'STAFF')
  @Get()
  findAll() {
    return this.productionMaterialsService.findAll();
  }

  @Roles('ADMIN', 'STAFF')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productionMaterialsService.findOne(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    updateProductionMaterialDto: UpdateProductionMaterialDto,
  ) {
    return this.productionMaterialsService.update(
      id,
      updateProductionMaterialDto,
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productionMaterialsService.remove(id);
  }
}
