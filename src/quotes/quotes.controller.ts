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

import { QuotesService } from './quotes.service';

import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@ApiBearerAuth()
@Roles('ADMIN')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Roles('ADMIN', 'STAFF')
  @Post()
  create(
    @Body()
    createQuoteDto: CreateQuoteDto,
  ) {
    return this.quotesService.create(createQuoteDto);
  }

  @Roles('ADMIN', 'STAFF')
  @Get()
  findAll() {
    return this.quotesService.findAll();
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/send')
  send(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotesService.send(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/accept')
  accept(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotesService.accept(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotesService.reject(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotesService.cancel(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Post(':id/expire')
  expire(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotesService.expire(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotesService.findOne(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    updateQuoteDto: UpdateQuoteDto,
  ) {
    return this.quotesService.update(id, updateQuoteDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotesService.remove(id);
  }
}
