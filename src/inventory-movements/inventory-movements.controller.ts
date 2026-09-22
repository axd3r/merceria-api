import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { InventoryMovementsService } from './inventory-movements.service';

import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';

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
    return this.inventoryMovementsService.create(
      createInventoryMovementDto,
    );
  }

  @Get()
  findAll() {
    return this.inventoryMovementsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryMovementsService.findOne(
      id,
    );
  }
}