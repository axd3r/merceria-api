import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(10)
  abbreviation: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([
    'COUNT',
    'LENGTH',
    'WEIGHT',
    'PACKAGE',
  ])
  type: string;
}