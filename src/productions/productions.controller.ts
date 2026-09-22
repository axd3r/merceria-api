import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ProductionCostsDto } from './dto/production-costs.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { ProductionsService } from './productions.service';

import { CreateProductionDto } from './dto/create-production.dto';

import { UpdateProductionDto } from './dto/update-production.dto';

@Controller('productions')
export class ProductionsController {
  constructor(private readonly productionsService: ProductionsService) {}

  @Post()
  create(
    @Body()
    createProductionDto: CreateProductionDto,
  ) {
    return this.productionsService.create(createProductionDto);
  }

  @Get()
  findAll() {
    return this.productionsService.findAll();
  }

  @Get(':id/costs')
  @ApiOperation({
    summary: 'Resumen de costos registrados de producción',
    description:
      'Suma los subtotales de todas las tareas y materiales registrados, incluidas tareas canceladas. No representa pagos realizados ni precio de venta. En producciones abiertas cambia al editar sus registros.',
  })
  @ApiOkResponse({ type: ProductionCostsDto })
  getCosts(@Param('id', ParseUUIDPipe) id: string) {
    return this.productionsService.getCosts(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateProductionDto: UpdateProductionDto,
  ) {
    return this.productionsService.update(id, updateProductionDto);
  }

  @Post(':id/start')
  start(@Param('id') id: string) {
    return this.productionsService.start(id);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.productionsService.complete(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.productionsService.cancel(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productionsService.remove(id);
  }
}
