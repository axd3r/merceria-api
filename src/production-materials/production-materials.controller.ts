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

@Controller('production-materials')
export class ProductionMaterialsController {
  constructor(
    private readonly productionMaterialsService: ProductionMaterialsService,
  ) {}

  @Post()
  create(
    @Body()
    createProductionMaterialDto: CreateProductionMaterialDto,
  ) {
    return this.productionMaterialsService.create(createProductionMaterialDto);
  }

  @Get()
  findAll() {
    return this.productionMaterialsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productionMaterialsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateProductionMaterialDto: UpdateProductionMaterialDto,
  ) {
    return this.productionMaterialsService.update(
      id,
      updateProductionMaterialDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productionMaterialsService.remove(id);
  }
}
