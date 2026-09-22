import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateQuoteDto {
  @IsUUID()
  customerId: string;

  @IsDateString()
  quoteDate: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}