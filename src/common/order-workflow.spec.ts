import { businessDay, assertCancellable } from './order-workflow';
import { EntityManager } from 'typeorm';
import { Order } from '../orders/entities/order.entity';

describe('Cancellation dates', () => {
  it('uses the Lima calendar day across midnight UTC', () => {
    expect(businessDay(new Date('2026-09-22T04:59:59Z'), 'America/Lima')).toBe(
      '2026-09-21',
    );
    expect(businessDay(new Date('2026-09-22T05:00:00Z'), 'America/Lima')).toBe(
      '2026-09-22',
    );
  });
  it('cannot bypass the time limit by changing the editable orderDate', async () => {
    const order = {
      status: 'PENDING',
      createdAt: new Date(Date.now() - 86400000),
      orderDate: businessDay(new Date()),
    } as Order;
    await expect(assertCancellable({} as EntityManager, order)).rejects.toThrow(
      'Cancellation is only allowed',
    );
  });
});
