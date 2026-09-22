import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsUUID()
  orderId: string;

  @IsOptional()
  @IsUUID()
  productUnitId?: string;

  @IsIn(['PRODUCT', 'CUSTOM'])
  itemType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.0001)
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  unitPrice: number;
}