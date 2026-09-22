import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateProductUnitDto } from './dto/create-product-unit.dto';
import { UpdateProductUnitDto } from './dto/update-product-unit.dto';
import { ProductUnitsService } from './product-units.service';

@Controller('product-units')
export class ProductUnitsController {
  constructor(
    private readonly productUnitsService: ProductUnitsService,
  ) {}

  @Post()
  create(@Body() createProductUnitDto: CreateProductUnitDto) {
    return this.productUnitsService.create(
      createProductUnitDto,
    );
  }

  @Get()
  findAll() {
    return this.productUnitsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productUnitsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductUnitDto: UpdateProductUnitDto,
  ) {
    return this.productUnitsService.update(
      id,
      updateProductUnitDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productUnitsService.remove(id);
  }
}