import {
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

import { CreateQuoteDto } from './create-quote.dto';

export class UpdateQuoteDto extends PartialType(
  CreateQuoteDto,
) {
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}