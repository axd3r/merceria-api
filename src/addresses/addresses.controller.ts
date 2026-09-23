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

import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressesService } from './addresses.service';

@ApiBearerAuth()
@Roles('ADMIN')
@Controller()
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Roles('ADMIN', 'STAFF')
  @Post('customers/:customerId/addresses')
  create(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    return this.addressesService.create(customerId, createAddressDto);
  }

  @Roles('ADMIN', 'STAFF')
  @Get('customers/:customerId/addresses')
  findAllByCustomer(@Param('customerId', ParseUUIDPipe) customerId: string) {
    return this.addressesService.findAllByCustomer(customerId);
  }

  @Roles('ADMIN', 'STAFF')
  @Get('addresses/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.addressesService.findOne(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Patch('addresses/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.addressesService.update(id, updateAddressDto);
  }

  @Delete('addresses/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.addressesService.remove(id);
  }
}
