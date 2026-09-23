import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Production } from '../productions/entities/production.entity';
import { ProductionTask } from '../production-tasks/entities/production-task.entity';

export function businessDay(
  date: Date,
  timeZone = process.env.BUSINESS_TIMEZONE || 'America/Lima',
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export async function lockOrder(
  manager: EntityManager,
  id: string,
): Promise<Order> {
  const order = await manager.findOne(Order, {
    where: { id },
    lock: { mode: 'pessimistic_write' },
  });
  if (!order) throw new NotFoundException('Order not found');
  return order;
}
// Lock order first in all linked transitions, including cancellation.
export async function lockProduction(manager: EntityManager, id: string) {
  const linked = await manager.findOne(Production, {
    where: { id },
    relations: { order: true },
  });
  if (!linked) throw new NotFoundException('Production not found');
  const order = await lockOrder(manager, linked.order.id);
  const production = await manager.findOne(Production, {
    where: { id },
    lock: { mode: 'pessimistic_write' },
  });
  if (!production) throw new NotFoundException('Production not found');
  production.order = order;
  return production;
}
export async function assertCancellable(manager: EntityManager, order: Order) {
  if (!['PENDING', 'CONFIRMED'].includes(order.status))
    throw new BadRequestException(
      'Only pending or confirmed orders can be cancelled',
    );
  const today = businessDay(new Date());
  if (businessDay(order.createdAt) !== today || order.orderDate !== today) {
    throw new BadRequestException(
      'Cancellation is only allowed on the day the order was placed',
    );
  }
  if (await manager.count(Payment, { where: { order: { id: order.id } } })) {
    throw new BadRequestException(
      'Orders with an advance or payment cannot be cancelled',
    );
  }
  const productions = await manager.find(Production, {
    where: { order: { id: order.id } },
  });
  if (
    productions.some(
      (p) => p.startedAt || !['PENDING', 'CANCELLED'].includes(p.status),
    )
  ) {
    throw new BadRequestException(
      'Orders with started production cannot be cancelled',
    );
  }
  // Also detect inconsistent legacy data with work already started.
  const tasks = await manager.find(ProductionTask, {
    where: { production: { order: { id: order.id } } },
  });
  if (tasks.some((t) => ['IN_PROGRESS', 'COMPLETED'].includes(t.status))) {
    throw new BadRequestException('Work has already started');
  }
}
export async function cancelOrder(
  manager: EntityManager,
  id: string,
): Promise<Order> {
  const order = await lockOrder(manager, id);
  await assertCancellable(manager, order);
  const productions = await manager.find(Production, {
    where: { order: { id } },
  });
  for (const production of productions) {
    if (production.status === 'PENDING') {
      production.status = 'CANCELLED';
      await manager.save(Production, production);
      const tasks = await manager.find(ProductionTask, {
        where: { production: { id: production.id } },
      });
      for (const task of tasks) {
        task.status = 'CANCELLED';
        await manager.save(ProductionTask, task);
      }
    }
  }
  order.status = 'CANCELLED';
  return manager.save(Order, order);
}
