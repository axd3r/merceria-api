import { ParseUUIDPipe } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { PaymentsService } from './payments.service';

import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiBearerAuth()
@Roles('ADMIN')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles('ADMIN', 'STAFF')
  @Post()
  create(
    @Body()
    createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Roles('ADMIN', 'STAFF')
  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Roles('ADMIN', 'STAFF')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id);
  }
}
