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

@Controller('production-tasks')
export class ProductionTasksController {
  constructor(
    private readonly productionTasksService: ProductionTasksService,
  ) {}

  @Post()
  create(
    @Body()
    createProductionTaskDto: CreateProductionTaskDto,
  ) {
    return this.productionTasksService.create(
      createProductionTaskDto,
    );
  }

  @Get()
  findAll() {
    return this.productionTasksService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.productionTasksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateProductionTaskDto: UpdateProductionTaskDto,
  ) {
    return this.productionTasksService.update(
      id,
      updateProductionTaskDto,
    );
  }

  @Post(':id/start')
  start(
    @Param('id') id: string,
  ) {
    return this.productionTasksService.start(
      id,
    );
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
  ) {
    return this.productionTasksService.complete(
      id,
    );
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
  ) {
    return this.productionTasksService.cancel(
      id,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.productionTasksService.remove(
      id,
    );
  }
}