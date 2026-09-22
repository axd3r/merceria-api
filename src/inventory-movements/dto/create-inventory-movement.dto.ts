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

export class CreateInventoryMovementDto {
  @IsUUID()
  inventoryId: string;

  @IsIn(['IN', 'OUT', 'ADJUSTMENT'])
  type: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.0001)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reason: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;
}