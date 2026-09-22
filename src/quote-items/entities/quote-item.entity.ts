import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Quote } from '../../quotes/entities/quote.entity';
import { ProductUnit } from '../../product-units/entities/product-unit.entity';

@Entity('quote_items')
export class QuoteItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => Quote,
    (quote) => quote.items,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;

  @ManyToOne(
    () => ProductUnit,
    { onDelete: 'RESTRICT', nullable: true },
  )
  @JoinColumn({ name: 'product_unit_id' })
  productUnit: ProductUnit | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'PRODUCT',
  })
  itemType: string;

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
  unitPrice: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  subtotal: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}