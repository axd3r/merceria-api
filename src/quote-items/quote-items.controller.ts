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

import { QuoteItemsService } from './quote-items.service';

import { CreateQuoteItemDto } from './dto/create-quote-item.dto';
import { UpdateQuoteItemDto } from './dto/update-quote-item.dto';

@ApiBearerAuth()
@Roles('ADMIN')
@Controller('quote-items')
export class QuoteItemsController {
  constructor(private readonly quoteItemsService: QuoteItemsService) {}

  @Roles('ADMIN', 'STAFF')
  @Post()
  create(
    @Body()
    createQuoteItemDto: CreateQuoteItemDto,
  ) {
    return this.quoteItemsService.create(createQuoteItemDto);
  }

  @Roles('ADMIN', 'STAFF')
  @Get()
  findAll() {
    return this.quoteItemsService.findAll();
  }

  @Roles('ADMIN', 'STAFF')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.quoteItemsService.findOne(id);
  }

  @Roles('ADMIN', 'STAFF')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    updateQuoteItemDto: UpdateQuoteItemDto,
  ) {
    return this.quoteItemsService.update(id, updateQuoteItemDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.quoteItemsService.remove(id);
  }
}
