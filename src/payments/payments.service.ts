import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, Repository } from 'typeorm';

import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';

import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: {
          id: createPaymentDto.orderId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status === 'CANCELLED') {
        throw new BadRequestException(
          'Cancelled orders cannot receive payments',
        );
      }

      if (order.status === 'PENDING') {
        throw new BadRequestException(
          'Order must be confirmed before receiving payments',
        );
      }

      const existingPayments = await manager.find(Payment, {
        where: {
          order: {
            id: order.id,
          },
        },
      });

      const paidAmount = existingPayments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0,
      );

      const orderTotal = Number(order.total);

      const paymentAmount = Number(createPaymentDto.amount);

      const remaining = Number((orderTotal - paidAmount).toFixed(2));

      if (paymentAmount > remaining) {
        throw new BadRequestException(
          `Payment exceeds remaining balance of ${remaining.toFixed(2)}`,
        );
      }

      const payment = manager.create(Payment, {
        order,
        paymentDate: createPaymentDto.paymentDate,
        method: createPaymentDto.method,
        amount: paymentAmount,
        reference: createPaymentDto.reference ?? null,
        notes: createPaymentDto.notes ?? null,
      });

      return manager.save(payment);
    });
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentRepository.find({
      relations: {
        order: true,
      },
    });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: {
        id,
      },
      relations: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }
}
