import { ApiProperty } from '@nestjs/swagger';

export class ProductionCostsDto {
  @ApiProperty({ format: 'uuid' })
  productionId: string;

  @ApiProperty({ example: 'COMPLETED' })
  status: string;

  @ApiProperty({ example: 1 })
  tasksCount: number;

  @ApiProperty({ example: 2 })
  materialsCount: number;

  @ApiProperty({ example: 40 })
  tasksCost: number;

  @ApiProperty({ example: 10.5 })
  materialsCost: number;

  @ApiProperty({ example: 50.5 })
  totalCost: number;
}
