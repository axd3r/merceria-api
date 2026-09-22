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

import { Customer } from '../../customers/entities/customer.entity';

import { QuoteItem } from '../../quote-items/entities/quote-item.entity';

@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({
    type: 'date',
    name: 'quote_date',
  })
  quoteDate: string;

  @Column({
    type: 'date',
    name: 'valid_until',
    nullable: true,
  })
  validUntil: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'DRAFT',
  })
  status: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  subtotal: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discount: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  total: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  notes: string | null;

  @OneToMany(
    () => QuoteItem,
    (quoteItem) => quoteItem.quote,
  )
  items: QuoteItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}