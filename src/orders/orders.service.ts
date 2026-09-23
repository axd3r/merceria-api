import {
  assertCancellable,
  cancelOrder,
  lockOrder,
} from '../common/order-workflow';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, EntityManager, Repository } from 'typeorm';

import { Production } from '../productions/entities/production.entity';
import { Order } from './entities/order.entity';

import { Customer } from '../customers/entities/customer.entity';

import { Quote } from '../quotes/entities/quote.entity';

import { OrderItem } from '../order-items/entities/order-item.entity';

import { Inventory } from '../inventory/entities/inventory.entity';

import { InventoryMovement } from '../inventory-movements/entities/inventory-movement.entity';

import { Payment } from '../payments/entities/payment.entity';

import { CreateOrderDto } from './dto/create-order.dto';

import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,

    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(Customer, {
        where: {
          id: createOrderDto.customerId,
        },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      if (createOrderDto.quoteId && createOrderDto.agreedPrice !== undefined) {
        throw new BadRequestException(
          'Agreed price cannot be combined with a quote',
        );
      }
      let quote: Quote | null = null;

      if (createOrderDto.quoteId) {
        const existingOrder = await manager.findOne(Order, {
          where: {
            quote: {
              id: createOrderDto.quoteId,
            },
          },
        });

        if (existingOrder) {
          throw new BadRequestException('This quote already has an order');
        }

        quote = await manager.findOne(Quote, {
          where: {
            id: createOrderDto.quoteId,
          },
          relations: {
            customer: true,
            items: {
              productUnit: {
                product: true,
                unit: true,
              },
            },
          },
        });

        if (!quote) {
          throw new NotFoundException('Quote not found');
        }

        if (quote.status !== 'ACCEPTED') {
          throw new BadRequestException(
            'Only accepted quotes can create orders',
          );
        }

        if (quote.customer.id !== createOrderDto.customerId) {
          throw new BadRequestException(
            'Order customer must match quote customer',
          );
        }

        if (quote.items.length === 0) {
          throw new BadRequestException('Quote must have at least one item');
        }
      }

      const order = manager.create(Order, {
        customer,
        quote,
        orderDate: createOrderDto.orderDate,
        status: 'PENDING',
        agreedPrice: createOrderDto.agreedPrice ?? null,
        subtotal: quote
          ? Number(quote.subtotal)
          : (createOrderDto.agreedPrice ?? 0),
        discount: quote ? Number(quote.discount) : 0,
        total: quote ? Number(quote.total) : (createOrderDto.agreedPrice ?? 0),
        notes: createOrderDto.notes ?? null,
      });

      const savedOrder = await manager.save(order);

      if (quote) {
        const orderItems = quote.items.map((quoteItem) =>
          manager.create(OrderItem, {
            order: savedOrder,
            productUnit: quoteItem.productUnit,
            itemType: quoteItem.itemType,
            description: quoteItem.description,
            quantity: Number(quoteItem.quantity),
            unitPrice: Number(quoteItem.unitPrice),
            subtotal: Number(quoteItem.subtotal),
          }),
        );

        await manager.save(OrderItem, orderItems);
      }

      return manager.findOneOrFail(Order, {
        where: {
          id: savedOrder.id,
        },
        relations: {
          customer: true,
          quote: true,
          items: {
            productUnit: {
              product: true,
              unit: true,
            },
          },
        },
      });
    });
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: {
        customer: true,
        quote: true,
        items: {
          productUnit: {
            product: true,
            unit: true,
          },
        },
      },
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: {
        customer: true,
        quote: true,
        items: {
          productUnit: {
            product: true,
            unit: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getBalance(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const paid = Number(
      await this.paymentRepository.sum('amount', {
        order: {
          id,
        },
      }),
    );

    const total = Number(order.total);

    const remaining = Math.max(Number((total - paid).toFixed(2)), 0);

    return {
      orderId: order.id,
      total,
      paid,
      remaining,
    };
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      await lockOrder(manager, id);
      const order = await manager.findOne(Order, {
        where: { id },
        relations: {
          items: true,
          quote: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const initialPriceOnly =
        ['CONFIRMED', 'IN_PROGRESS', 'READY'].includes(order.status) &&
        order.agreedPrice == null &&
        Number(order.subtotal) === 0 &&
        updateOrderDto.agreedPrice !== undefined &&
        updateOrderDto.orderDate === undefined &&
        updateOrderDto.notes === undefined &&
        updateOrderDto.discount === undefined;
      if (order.status !== 'PENDING' && !initialPriceOnly) {
        throw new BadRequestException('Only pending orders can be modified');
      }

      if (updateOrderDto.agreedPrice !== undefined) {
        if (order.items.length || order.quote) {
          throw new BadRequestException(
            'Agreed price is only available for orders without items or quote',
          );
        }
        const paid = Number(
          await manager.getRepository(Payment).sum('amount', { order: { id } }),
        );
        if (paid > 0)
          throw new BadRequestException(
            'Price cannot be changed after payments',
          );
        order.agreedPrice = updateOrderDto.agreedPrice;
        order.subtotal = updateOrderDto.agreedPrice;
      }
      const discount = Number(updateOrderDto.discount ?? order.discount);
      if (discount > Number(order.subtotal))
        throw new BadRequestException(
          'Discount cannot be greater than subtotal',
        );
      order.total = Number((Number(order.subtotal) - discount).toFixed(2));

      if (updateOrderDto.orderDate) {
        order.orderDate = updateOrderDto.orderDate;
      }

      if (updateOrderDto.notes !== undefined) {
        order.notes = updateOrderDto.notes;
      }

      order.discount = discount;

      return manager.save(order);
    });
  }

  async remove(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const order = await lockOrder(manager, id);
      if (order.status !== 'PENDING')
        throw new BadRequestException('Only pending orders can be deleted');
      await assertCancellable(manager, order);
      if (await manager.count(Production, { where: { order: { id } } })) {
        throw new BadRequestException(
          'Use cancellation to preserve the production history',
        );
      }
      await manager.remove(Order, order);
    });
  }

  async confirm(id: string): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await lockOrder(manager, id);
      if (order.status !== 'PENDING')
        throw new BadRequestException('Only pending orders can be confirmed');
      const count = await manager.count(OrderItem, {
        where: { order: { id } },
      });
      if (!count && order.agreedPrice == null)
        throw new BadRequestException(
          'Order must have items or an agreed price',
        );
      if (Number(order.total) <= 0)
        throw new BadRequestException('Order total must be greater than zero');
      order.status = 'CONFIRMED';
      return manager.save(Order, order);
    });
  }

  async start(id: string): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      await lockOrder(manager, id);
      const order = await manager.findOne(Order, {
        where: { id },
        relations: {
          items: {
            productUnit: {
              product: true,
              unit: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== 'CONFIRMED') {
        throw new BadRequestException('Only confirmed orders can be started');
      }

      for (const item of order.items) {
        if (item.itemType !== 'PRODUCT') {
          continue;
        }

        if (!item.productUnit) {
          continue;
        }

        if (!item.productUnit.trackStock) {
          continue;
        }

        const inventory = await manager.findOne(Inventory, {
          lock: { mode: 'pessimistic_write' },
          where: {
            productUnit: {
              id: item.productUnit.id,
            },
          },
        });

        if (!inventory) {
          throw new BadRequestException(
            `Inventory not found for product unit ${item.productUnit.id}`,
          );
        }

        const previousQuantity = Number(inventory.quantity);

        const quantity = Number(item.quantity);

        const newQuantity = previousQuantity - quantity;

        if (newQuantity < 0) {
          throw new BadRequestException(
            `Insufficient inventory for product ${item.productUnit.product.name}`,
          );
        }

        inventory.quantity = newQuantity;

        await manager.save(Inventory, inventory);

        const movement = manager.create(InventoryMovement, {
          inventory,
          type: 'OUT',
          quantity,
          previousQuantity,
          newQuantity,
          reason: 'ORDER',
          referenceId: order.id,
        });

        await manager.save(InventoryMovement, movement);
      }

      order.status = 'IN_PROGRESS';

      await manager.save(Order, order);

      return manager.findOneOrFail(Order, {
        where: {
          id: order.id,
        },
        relations: {
          customer: true,
          quote: true,
          items: {
            productUnit: {
              product: true,
              unit: true,
            },
          },
        },
      });
    });
  }

  private async assertProductionCompleted(
    manager: EntityManager,
    orderId: string,
  ) {
    const productions = await manager.find(Production, {
      where: { order: { id: orderId } },
    });
    if (productions.some((production) => production.status !== 'COMPLETED')) {
      throw new BadRequestException(
        'Complete the production before marking the order ready or delivering it',
      );
    }
  }

  async ready(id: string): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'IN_PROGRESS')
        throw new BadRequestException(
          'Only orders in progress can be marked as ready',
        );
      await this.assertProductionCompleted(manager, id);
      order.status = 'READY';
      return manager.save(Order, order);
    });
  }

  async deliver(id: string): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== 'READY') {
        throw new BadRequestException('Only ready orders can be delivered');
      }

      await this.assertProductionCompleted(manager, id);
      if (Number(order.total) <= 0)
        throw new BadRequestException(
          'Set a positive order price before delivery',
        );
      const paid = Number(
        await manager.getRepository(Payment).sum('amount', {
          order: {
            id,
          },
        }),
      );

      const total = Number(order.total);

      const remaining = Math.max(Number((total - paid).toFixed(2)), 0);

      if (remaining > 0) {
        throw new BadRequestException(
          `Order has a pending balance of S/ ${remaining.toFixed(2)}`,
        );
      }

      order.status = 'DELIVERED';

      return manager.save(Order, order);
    });
  }

  async cancel(id: string): Promise<Order> {
    return this.dataSource.transaction((manager) => cancelOrder(manager, id));
  }

  async recalculate(manager: EntityManager, orderId: string): Promise<Order> {
    const order = await manager.findOne(Order, {
      where: {
        id: orderId,
      },
      relations: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const subtotal =
      order.agreedPrice != null
        ? Number(order.agreedPrice)
        : order.items.reduce((sum, item) => sum + Number(item.subtotal), 0);

    const discount = Number(order.discount);

    if (discount > subtotal) {
      throw new BadRequestException('Discount cannot be greater than subtotal');
    }

    order.subtotal = subtotal;

    order.total = subtotal - discount;

    return manager.save(order);
  }
}
