import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ValidateIf,
  IsNumber as PriceNumber,
  Min as PriceMin,
  Max,
} from 'class-validator';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateOrderDto {
  @ApiPropertyOptional({
    example: 100,
    description:
      'Precio acordado antes del descuento, para pedidos sin items ni cotizacion.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @PriceNumber({ maxDecimalPlaces: 2 })
  @PriceMin(0.01)
  @Max(9999999999.99)
  agreedPrice?: number;

  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsUUID()
  quoteId?: string;

  @IsDateString()
  orderDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
