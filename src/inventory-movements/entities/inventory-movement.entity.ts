import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Inventory } from '../../inventory/entities/inventory.entity';

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => Inventory,
    (inventory) => inventory.movements,
    { onDelete: 'RESTRICT' },
  )
  @JoinColumn({ name: 'inventory_id' })
  inventory: Inventory;

  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  quantity: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 4,
    name: 'previous_quantity',
  })
  previousQuantity: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 4,
    name: 'new_quantity',
  })
  newQuantity: number;

  @Column({ type: 'varchar', length: 100 })
  reason: string;

  @Column({
    type: 'uuid',
    name: 'reference_id',
    nullable: true,
  })
  referenceId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}