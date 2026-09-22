import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductionTaskDto {
  @IsUUID()
  productionId: string;

  @IsUUID()
  serviceProviderId: string;

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
  unitCost: number;
}