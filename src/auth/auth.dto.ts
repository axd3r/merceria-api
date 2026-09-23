import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  Matches,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;
  @ApiProperty({ format: 'password' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
export class CreateUserDto extends LoginDto {
  @ApiProperty({ format: 'password', minLength: 12 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  declare password: string;
  @ApiProperty({ example: 'Operador' })
  @IsString()
  @Matches(/\S/)
  @MaxLength(100)
  name: string;
  @ApiProperty({ enum: ['ADMIN', 'STAFF'] })
  @IsIn(['ADMIN', 'STAFF'])
  role: 'ADMIN' | 'STAFF';
}
export class UpdateUserDto {
  @ApiPropertyOptional({ enum: ['ADMIN', 'STAFF'] })
  @ValidateIf((_o, value) => value !== undefined)
  @IsIn(['ADMIN', 'STAFF'])
  role?: 'ADMIN' | 'STAFF';
  @ApiPropertyOptional()
  @ValidateIf((_o, value) => value !== undefined)
  @IsBoolean()
  active?: boolean;
}
export class ResetPasswordDto {
  @ApiProperty({ format: 'password', minLength: 12 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword: string;
}
export class ChangePasswordDto extends ResetPasswordDto {
  @ApiProperty({ format: 'password' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword: string;
}
