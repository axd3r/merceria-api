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
import { ServiceProvider } from '../../service-providers/entities/service-provider.entity';

@Entity('production_tasks')
export class ProductionTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => Production,
    (production) => production.tasks,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'production_id' })
  production: Production;

  @ManyToOne(
    () => ServiceProvider,
    { onDelete: 'RESTRICT' },
  )
  @JoinColumn({ name: 'service_provider_id' })
  serviceProvider: ServiceProvider;

  @Column({
    type: 'varchar',
    length: 255,
  })
  description: string;

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

  @Column({
    type: 'varchar',
    length: 20,
    default: 'PENDING',
  })
  status: string;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}