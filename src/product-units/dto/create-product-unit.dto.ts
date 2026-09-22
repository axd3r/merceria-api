import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateProductUnitDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  unitId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.0001)
  conversionFactor: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;
  
  @IsBoolean()
  trackStock: boolean;
  
  @IsBoolean()
  isPurchaseUnit: boolean;

  @IsBoolean()
  isSaleUnit: boolean;
}