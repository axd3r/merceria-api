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

@Controller()
export class AddressesController {
  constructor(
    private readonly addressesService: AddressesService,
  ) {}

  @Post('customers/:customerId/addresses')
  create(
    @Param('customerId') customerId: string,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    return this.addressesService.create(
      customerId,
      createAddressDto,
    );
  }

  @Get('customers/:customerId/addresses')
  findAllByCustomer(
    @Param('customerId') customerId: string,
  ) {
    return this.addressesService.findAllByCustomer(customerId);
  }

  @Get('addresses/:id')
  findOne(@Param('id') id: string) {
    return this.addressesService.findOne(id);
  }

  @Patch('addresses/:id')
  update(
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.addressesService.update(
      id,
      updateAddressDto,
    );
  }

  @Delete('addresses/:id')
  remove(@Param('id') id: string) {
    return this.addressesService.remove(id);
  }
}