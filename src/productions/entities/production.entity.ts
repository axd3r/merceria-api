import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ProductionMaterial } from '../../production-materials/entities/production-material.entity';

import { Order } from '../../orders/entities/order.entity';
import { ProductionTask } from '../../production-tasks/entities/production-task.entity';

@Entity('productions')
export class Production {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'PENDING',
  })
  status: string;

  @Column({
    type: 'timestamp',
    name: 'started_at',
    nullable: true,
  })
  startedAt: Date | null;

  @Column({
    type: 'timestamp',
    name: 'completed_at',
    nullable: true,
  })
  completedAt: Date | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  notes: string | null;

  @OneToMany(() => ProductionTask, (task) => task.production)
  tasks: ProductionTask[];

  @OneToMany(() => ProductionMaterial, (material) => material.production)
  materials: ProductionMaterial[];

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
