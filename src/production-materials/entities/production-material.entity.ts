import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Production } from '../../productions/entities/production.entity';
import { ProductUnit } from '../../product-units/entities/product-unit.entity';

@Entity('production_materials')
export class ProductionMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Production, (production) => production.materials, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'production_id' })
  production: Production;

  @ManyToOne(() => ProductUnit, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'product_unit_id' })
  productUnit: ProductUnit | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  quantity: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  unitCost: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  subtotal: number;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
