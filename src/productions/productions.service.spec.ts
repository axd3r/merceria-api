import { DataSource, EntityManager, Repository } from 'typeorm';
import { Production } from './entities/production.entity';
import { ProductionTask } from '../production-tasks/entities/production-task.entity';
import { OrderItem } from '../order-items/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { ProductionsService } from './productions.service';

describe('Production workflow', () => {
  let service: ProductionsService;
  let production: Production;
  let tasks: Partial<ProductionTask>[];
  let order: Partial<Order>;
  let existing: Production | null;
  let save: jest.Mock;
  let items: Partial<OrderItem>[];

  beforeEach(() => {
    production = { id: 'production', status: 'PENDING' } as Production;
    tasks = [];
    order = { id: 'order', status: 'PENDING' };
    existing = null;
    items = [];
    production.order = order as Order;
    save = jest.fn((_entity, value) => Promise.resolve(value));
    const manager = {
      findOne: jest.fn((entity, options) => {
        if (entity === Order) return Promise.resolve(order);
        if (entity === Production) {
          return Promise.resolve(options.where.order ? existing : production);
        }
        throw new Error('Production must not query inventory or materials');
      }),
      findOneOrFail: jest.fn((entity) =>
        Promise.resolve(entity === Order ? order : production),
      ),
      find: jest.fn((entity) => {
        if (entity === OrderItem) return Promise.resolve(items);
        if (entity === ProductionTask) return Promise.resolve(tasks);
        throw new Error('Production must not consume materials');
      }),
      create: jest.fn((_entity, value) => value),
      save,
    } as unknown as EntityManager;
    const dataSource = {
      transaction: (callback: (em: EntityManager) => unknown) =>
        callback(manager),
    } as unknown as DataSource;
    service = new ProductionsService(
      {} as Repository<Production>,
      {} as Repository<ProductionTask>,
      {} as Repository<Order>,
      dataSource,
    );
  });

  it.each(['CANCELLED', 'DELIVERED'])(
    'rejects creation for an order in %s',
    async (status) => {
      order.status = status;
      await expect(service.create({ orderId: 'order' })).rejects.toThrow(
        'This order cannot have production',
      );
      expect(save).not.toHaveBeenCalled();
    },
  );

  it('creates a pending production for a pending order without requiring items', async () => {
    await expect(service.create({ orderId: 'order' })).resolves.toMatchObject({
      status: 'PENDING',
      startedAt: null,
      completedAt: null,
    });
  });

  it('rejects a second production for the same order', async () => {
    existing = production;
    await expect(service.create({ orderId: 'order' })).rejects.toThrow(
      'This order already has a production',
    );
  });

  it('cannot start without tasks', async () => {
    await expect(service.start('production')).rejects.toThrow(
      'Production must have at least one task before starting',
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('starts with a task and records the start date', async () => {
    tasks = [{ status: 'PENDING' }];
    await expect(service.start('production')).resolves.toMatchObject({
      status: 'IN_PROGRESS',
      startedAt: expect.any(Date),
    });
  });

  it.each(['PENDING', 'IN_PROGRESS', 'CANCELLED'])(
    'cannot complete with a task in %s',
    async (status) => {
      production.status = 'IN_PROGRESS';
      tasks = [{ status: 'COMPLETED' }, { status }];
      await expect(service.complete('production')).rejects.toThrow(
        'All production tasks must be completed',
      );
      expect(save).not.toHaveBeenCalled();
    },
  );

  it('cannot complete without tasks', async () => {
    production.status = 'IN_PROGRESS';
    await expect(service.complete('production')).rejects.toThrow(
      'Production must have at least one task',
    );
  });

  it('completes after all tasks, without accessing materials or inventory', async () => {
    production.status = 'IN_PROGRESS';
    tasks = [{ status: 'COMPLETED' }];
    await expect(service.complete('production')).resolves.toMatchObject({
      status: 'COMPLETED',
      completedAt: expect.any(Date),
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(order.status).toBe('READY');
    expect(save).toHaveBeenCalledWith(Production, production);
    const completedAt = production.completedAt;
    await expect(service.complete('production')).resolves.toMatchObject({
      status: 'COMPLETED',
    });
    expect(production.completedAt).toBe(completedAt);
    expect(save).toHaveBeenCalledTimes(2);
  });
  it.each(['CANCELLED', 'DELIVERED'])(
    'does not overwrite order status %s',
    async (status) => {
      production.status = 'IN_PROGRESS';
      tasks = [{ status: 'COMPLETED' }];
      order.status = status;
      await expect(service.complete('production')).rejects.toThrow(
        'This order cannot be marked as ready',
      );
      expect(save).not.toHaveBeenCalled();
    },
  );

  it('does not bypass sales inventory on an unstarted mixed order', async () => {
    production.status = 'IN_PROGRESS';
    tasks = [{ status: 'COMPLETED' }];
    items = [
      {
        itemType: 'PRODUCT',
        productUnit: { trackStock: true } as OrderItem['productUnit'],
      },
    ];
    await expect(service.complete('production')).rejects.toThrow(
      'Start the order',
    );
    expect(save).not.toHaveBeenCalled();
    order.status = 'IN_PROGRESS';
    await service.complete('production');
    expect(order.status).toBe('READY');
  });

  it('can sync a previously completed production without changing its completion date', async () => {
    production.status = 'COMPLETED';
    production.completedAt = new Date('2026-09-21');
    tasks = [{ status: 'COMPLETED' }];
    const result = await service.complete('production');
    expect(result.order.status).toBe('READY');
    expect(result.completedAt).toEqual(new Date('2026-09-21'));
    expect(save).toHaveBeenCalledTimes(1);
  });
});
