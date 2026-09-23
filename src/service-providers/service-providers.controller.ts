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

import { ServiceProvidersService } from './service-providers.service';

import { CreateServiceProviderDto } from './dto/create-service-provider.dto';

import { UpdateServiceProviderDto } from './dto/update-service-provider.dto';

@ApiBearerAuth()
@Roles('ADMIN')
@Controller('service-providers')
export class ServiceProvidersController {
  constructor(
    private readonly serviceProvidersService: ServiceProvidersService,
  ) {}

  @Post()
  create(
    @Body()
    createServiceProviderDto: CreateServiceProviderDto,
  ) {
    return this.serviceProvidersService.create(createServiceProviderDto);
  }

  @Roles('ADMIN', 'STAFF')
  @Get()
  findAll() {
    return this.serviceProvidersService.findAll();
  }

  @Roles('ADMIN', 'STAFF')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.serviceProvidersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    updateServiceProviderDto: UpdateServiceProviderDto,
  ) {
    return this.serviceProvidersService.update(id, updateServiceProviderDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.serviceProvidersService.remove(id);
  }
}
