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

@Controller('quote-items')
export class QuoteItemsController {
  constructor(
    private readonly quoteItemsService: QuoteItemsService,
  ) {}

  @Post()
  create(
    @Body()
    createQuoteItemDto: CreateQuoteItemDto,
  ) {
    return this.quoteItemsService.create(
      createQuoteItemDto,
    );
  }

  @Get()
  findAll() {
    return this.quoteItemsService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.quoteItemsService.findOne(
      id,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateQuoteItemDto: UpdateQuoteItemDto,
  ) {
    return this.quoteItemsService.update(
      id,
      updateQuoteItemDto,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.quoteItemsService.remove(id);
  }
}