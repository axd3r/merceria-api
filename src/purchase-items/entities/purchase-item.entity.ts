import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Purchase } from '../../purchases/entities/purchase.entity';
import { ProductUnit } from '../../product-units/entities/product-unit.entity';

@Entity('purchase_items')
export class PurchaseItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Purchase, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'purchase_id' })
  purchase: Purchase;

  @ManyToOne(() => ProductUnit, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_unit_id' })
  productUnit: ProductUnit;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}