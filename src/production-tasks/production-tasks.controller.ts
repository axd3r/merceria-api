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

import { ProductionTasksService } from './production-tasks.service';

import { CreateProductionTaskDto } from './dto/create-production-task.dto';

import { UpdateProductionTaskDto } from './dto/update-production-task.dto';

@ApiBearerAuth()
@Roles('ADMIN')
@Controller('production-tasks')
export class ProductionTasksController {
  constructor(
    private readonly productionTasksService: ProductionTasksService,
  ) {}

  @Roles('ADMIN', 'STAFF')
  @Post()
  create(
    @Body()
    createProductionTaskDto: CreateProductionTaskDto,
  ) {
    return this.productionTasksService.create(createProductionTaskDto);
  }

  @Roles('ADMIN', 'STAFF')
  @Get()
  findAll() {
    return this.productionTasksService.findAll();
  }

  @Roles('ADMIN', 'STAFF')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productionTasksService.findOne(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    updateProductionTaskDto: UpdateProductionTaskDto,
  ) {
    return this.productionTasksService.update(id, updateProductionTaskDto);
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/start')
  start(@Param('id', ParseUUIDPipe) id: string) {
    return this.productionTasksService.start(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/complete')
  complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.productionTasksService.complete(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.productionTasksService.cancel(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productionTasksService.remove(id);
  }
}
