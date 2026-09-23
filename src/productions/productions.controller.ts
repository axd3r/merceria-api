import { Roles } from '../auth/auth.decorators';
import { ApiBearerAuth } from '@nestjs/swagger';
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

@ApiBearerAuth()
@Roles('ADMIN')
@Controller('productions')
export class ProductionsController {
  constructor(private readonly productionsService: ProductionsService) {}

  @Roles('ADMIN', 'STAFF')
  @Post()
  create(
    @Body()
    createProductionDto: CreateProductionDto,
  ) {
    return this.productionsService.create(createProductionDto);
  }

  @Roles('ADMIN', 'STAFF')
  @Get()
  findAll() {
    return this.productionsService.findAll();
  }

  @Roles('ADMIN', 'STAFF')
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

  @Roles('ADMIN', 'STAFF')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productionsService.findOne(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    updateProductionDto: UpdateProductionDto,
  ) {
    return this.productionsService.update(id, updateProductionDto);
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/start')
  start(@Param('id', ParseUUIDPipe) id: string) {
    return this.productionsService.start(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/complete')
  complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.productionsService.complete(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.productionsService.cancel(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productionsService.remove(id);
  }
}
