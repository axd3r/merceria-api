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

@Controller('quotes')
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
  ) {}

  @Post()
  create(
    @Body()
    createQuoteDto: CreateQuoteDto,
  ) {
    return this.quotesService.create(
      createQuoteDto,
    );
  }

  @Get()
  findAll() {
    return this.quotesService.findAll();
  }

  @Post(':id/send')
  send(
    @Param('id') id: string,
  ) {
    return this.quotesService.send(id);
  }

  @Post(':id/accept')
  accept(
    @Param('id') id: string,
  ) {
    return this.quotesService.accept(id);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
  ) {
    return this.quotesService.reject(id);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
  ) {
    return this.quotesService.cancel(id);
  }

  @Post(':id/expire')
  expire(
    @Param('id') id: string,
  ) {
    return this.quotesService.expire(id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.quotesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateQuoteDto: UpdateQuoteDto,
  ) {
    return this.quotesService.update(
      id,
      updateQuoteDto,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.quotesService.remove(id);
  }
}