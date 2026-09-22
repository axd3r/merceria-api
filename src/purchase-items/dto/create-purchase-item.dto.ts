import {
  IsNotEmpty,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';

export class CreatePurchaseItemDto {
  @IsUUID()
  purchaseId: string;

  @IsUUID()
  productUnitId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.0001)
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  unitCost: number;
}