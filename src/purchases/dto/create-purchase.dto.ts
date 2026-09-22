import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePurchaseDto {
  @IsUUID()
  supplierId: string;

  @IsDateString()
  purchaseDate: string;

  @IsOptional()
  @IsIn([
    'PENDING',
    'COMPLETED',
    'CANCELLED',
  ])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}