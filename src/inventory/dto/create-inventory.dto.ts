import {
  IsNotEmpty,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateInventoryDto {
  @IsUUID()
  productUnitId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  quantity: number;
}