import { ParseUUIDPipe } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { InventoryMovementsService } from './inventory-movements.service';

import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';

@ApiBearerAuth()
@Roles('ADMIN')
@Controller('inventory-movements')
export class InventoryMovementsController {
  constructor(
    private readonly inventoryMovementsService: InventoryMovementsService,
  ) {}

  @Post()
  create(
    @Body()
    createInventoryMovementDto: CreateInventoryMovementDto,
  ) {
    return this.inventoryMovementsService.create(createInventoryMovementDto);
  }

  @Roles('ADMIN', 'STAFF')
  @Get()
  findAll() {
    return this.inventoryMovementsService.findAll();
  }

  @Roles('ADMIN', 'STAFF')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryMovementsService.findOne(id);
  }
}
