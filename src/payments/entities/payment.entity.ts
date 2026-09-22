import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Order } from '../../orders/entities/order.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'date', name: 'payment_date' })
  paymentDate: string;

  @Column({ type: 'varchar', length: 20 })
  method: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  amount: number;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  reference: string | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}