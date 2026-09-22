import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';

import { Quote } from './entities/quote.entity';
import { Customer } from '../customers/entities/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quote,
      Customer,
    ]),
  ],
  controllers: [
    QuotesController,
  ],
  providers: [
    QuotesService,
  ],
})
export class QuotesModule {}