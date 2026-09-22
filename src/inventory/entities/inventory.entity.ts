import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ProductUnit } from '../../product-units/entities/product-unit.entity';
import { InventoryMovement } from '../../inventory-movements/entities/inventory-movement.entity';

@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => ProductUnit, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_unit_id' })
  productUnit: ProductUnit;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 4,
    default: 0,
  })
  quantity: number;

  @OneToMany(
    () => InventoryMovement,
    (movement) => movement.inventory,
  )
  movements: InventoryMovement[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}