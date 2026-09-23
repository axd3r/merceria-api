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

import { OrdersService } from './orders.service';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@ApiBearerAuth()
@Roles('ADMIN')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles('ADMIN', 'STAFF')
  @Post()
  create(
    @Body()
    createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.create(createOrderDto);
  }

  @Roles('ADMIN', 'STAFF')
  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Roles('ADMIN', 'STAFF')
  @Get(':id/balance')
  getBalance(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.getBalance(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/confirm')
  confirm(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.confirm(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/start')
  start(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.start(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/ready')
  ready(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.ready(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/deliver')
  deliver(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.deliver(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.cancel(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.remove(id);
  }
}
