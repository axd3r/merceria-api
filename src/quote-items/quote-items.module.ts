import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QuoteItemsService } from './quote-items.service';
import { QuoteItemsController } from './quote-items.controller';

import { QuoteItem } from './entities/quote-item.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { ProductUnit } from '../product-units/entities/product-unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuoteItem,
      Quote,
      ProductUnit,
    ]),
  ],
  controllers: [
    QuoteItemsController,
  ],
  providers: [
    QuoteItemsService,
  ],
})
export class QuoteItemsModule {}