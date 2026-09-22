import { NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProductionsService } from './productions.service';
import { Production } from './entities/production.entity';
import { ProductionTask } from '../production-tasks/entities/production-task.entity';
import { Order } from '../orders/entities/order.entity';

describe('Production costs', () => {
  const findOne = jest.fn();
  const service = new ProductionsService(
    { findOne } as unknown as Repository<Production>,
    {} as Repository<ProductionTask>,
    {} as Repository<Order>,
    {} as DataSource,
  );

  it('adds stored decimal subtotals from multiple tasks and materials', async () => {
    findOne.mockResolvedValue({
      id: 'production',
      status: 'IN_PROGRESS',
      tasks: [{ subtotal: '40.00' }, { subtotal: '5.00' }],
      materials: [{ subtotal: '7.50' }, { subtotal: '3.00' }],
    });
    expect(await service.getCosts('production')).toEqual({
      productionId: 'production',
      status: 'IN_PROGRESS',
      tasksCount: 2,
      materialsCount: 2,
      tasksCost: 45,
      materialsCost: 10.5,
      totalCost: 55.5,
    });
  });

  it('returns zero for a production with no costs', async () => {
    findOne.mockResolvedValue({
      id: 'production',
      status: 'PENDING',
      tasks: [],
      materials: [],
    });
    expect(await service.getCosts('production')).toMatchObject({
      tasksCount: 0,
      materialsCount: 0,
      totalCost: 0,
    });
  });

  it('uses cents and retains all recorded costs, including cancelled tasks', async () => {
    findOne.mockResolvedValue({
      id: 'production',
      status: 'PENDING',
      tasks: [{ subtotal: '0.10', status: 'CANCELLED' }],
      materials: [{ subtotal: '0.20', productUnit: null }],
    });
    expect(await service.getCosts('production')).toMatchObject({
      tasksCost: 0.1,
      materialsCost: 0.2,
      totalCost: 0.3,
    });
  });

  it('reports a missing production instead of a zero total', async () => {
    findOne.mockResolvedValue(null);
    await expect(service.getCosts('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
