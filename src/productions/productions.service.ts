import {
  assertCancellable,
  cancelOrder,
  lockOrder,
  lockProduction,
} from '../common/order-workflow';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, Repository } from 'typeorm';

import { Production } from './entities/production.entity';

import { ProductionTask } from '../production-tasks/entities/production-task.entity';

import { OrderItem } from '../order-items/entities/order-item.entity';

import { Order } from '../orders/entities/order.entity';

import { CreateProductionDto } from './dto/create-production.dto';

import { UpdateProductionDto } from './dto/update-production.dto';

@Injectable()
export class ProductionsService {
  constructor(
    @InjectRepository(Production)
    private readonly productionRepository: Repository<Production>,

    @InjectRepository(ProductionTask)
    private readonly productionTaskRepository: Repository<ProductionTask>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createProductionDto: CreateProductionDto): Promise<Production> {
    return this.dataSource.transaction(async (manager) => {
      const order = await lockOrder(manager, createProductionDto.orderId);

      if (['CANCELLED', 'DELIVERED', 'READY'].includes(order.status)) {
        throw new BadRequestException('This order cannot have production');
      }

      const existingProduction = await manager.findOne(Production, {
        where: {
          order: {
            id: order.id,
          },
        },
      });

      if (existingProduction) {
        throw new BadRequestException('This order already has a production');
      }

      const production = manager.create(Production, {
        order,
        status: 'PENDING',
        startedAt: null,
        completedAt: null,
        notes: createProductionDto.notes ?? null,
      });

      return manager.save(Production, production);
    });
  }

  async findAll(): Promise<Production[]> {
    return this.productionRepository.find({
      relations: {
        order: {
          customer: true,
        },
        materials: { productUnit: true },
        tasks: {
          serviceProvider: true,
        },
      },
    });
  }

  async findOne(id: string): Promise<Production> {
    const production = await this.productionRepository.findOne({
      where: {
        id,
      },
      relations: {
        order: {
          customer: true,
        },
        materials: { productUnit: true },
        tasks: {
          serviceProvider: true,
        },
      },
    });

    if (!production) {
      throw new NotFoundException('Production not found');
    }

    return production;
  }

  async getCosts(id: string) {
    const production = await this.productionRepository.findOne({
      where: { id },
      relations: { tasks: true, materials: true },
    });
    if (!production) throw new NotFoundException('Production not found');

    // PostgreSQL numeric values arrive as strings. Sum stored line amounts
    // in cents so totals agree with the recorded, rounded subtotals.
    const sumCents = (lines: { subtotal: number }[]) =>
      lines.reduce(
        (sum, line) => sum + Math.round(Number(line.subtotal) * 100),
        0,
      );
    const tasksCents = sumCents(production.tasks);
    const materialsCents = sumCents(production.materials);

    return {
      productionId: production.id,
      status: production.status,
      tasksCount: production.tasks.length,
      materialsCount: production.materials.length,
      tasksCost: tasksCents / 100,
      materialsCost: materialsCents / 100,
      totalCost: (tasksCents + materialsCents) / 100,
    };
  }

  async update(id: string, dto: UpdateProductionDto): Promise<Production> {
    return this.dataSource.transaction(async (manager) => {
      const production = await lockProduction(manager, id);
      if (
        production.status !== 'PENDING' ||
        ['CANCELLED', 'DELIVERED'].includes(production.order.status)
      ) {
        throw new BadRequestException(
          'Only pending productions can be modified',
        );
      }
      if (dto.orderId && dto.orderId !== production.order.id)
        throw new BadRequestException('Production order cannot be changed');
      if (dto.notes !== undefined) production.notes = dto.notes;
      return manager.save(Production, production);
    });
  }

  async start(id: string): Promise<Production> {
    return this.dataSource.transaction(async (manager) => {
      const production = await lockProduction(manager, id);
      if (!production) {
        throw new NotFoundException('Production not found');
      }

      if (
        ['CANCELLED', 'DELIVERED', 'READY'].includes(production.order.status)
      ) {
        throw new BadRequestException('This order cannot start production');
      }
      if (production.status !== 'PENDING') {
        throw new BadRequestException(
          'Only pending productions can be started',
        );
      }

      const tasks = await manager.find(ProductionTask, {
        where: {
          production: {
            id: production.id,
          },
        },
      });

      if (tasks.length === 0) {
        throw new BadRequestException(
          'Production must have at least one task before starting',
        );
      }

      production.status = 'IN_PROGRESS';

      production.startedAt = new Date();

      return manager.save(Production, production);
    });
  }

  async complete(id: string): Promise<Production> {
    return this.dataSource.transaction(async (manager) => {
      const production = await lockProduction(manager, id);
      if (!production) throw new NotFoundException('Production not found');
      if (!['IN_PROGRESS', 'COMPLETED'].includes(production.status)) {
        throw new BadRequestException(
          'Only productions in progress can be completed',
        );
      }
      const tasks = await manager.find(ProductionTask, {
        where: { production: { id } },
      });
      if (!tasks.length)
        throw new BadRequestException('Production must have at least one task');
      if (tasks.some((task) => task.status !== 'COMPLETED')) {
        throw new BadRequestException(
          'All production tasks must be completed before completing the production',
        );
      }
      const order = production.order;
      if (order.status === 'CANCELLED' || order.status === 'DELIVERED') {
        throw new BadRequestException('This order cannot be marked as ready');
      }
      // Sales inventory remains the responsibility of the existing order start flow.
      if (['PENDING', 'CONFIRMED'].includes(order.status)) {
        const items = await manager.find(OrderItem, {
          where: { order: { id: order.id } },
          relations: { productUnit: true },
        });
        if (
          items.some(
            (item) =>
              item.itemType === 'PRODUCT' && item.productUnit?.trackStock,
          )
        ) {
          throw new BadRequestException(
            'Start the order before completing production to process sales inventory',
          );
        }
      }
      if (order.status !== 'READY') {
        order.status = 'READY';
        await manager.save(Order, order);
      }
      if (production.status !== 'COMPLETED') {
        production.status = 'COMPLETED';
        production.completedAt = new Date();
        await manager.save(Production, production);
      }
      production.order = order;
      return production;
    });
  }

  async cancel(id: string): Promise<Production> {
    return this.dataSource.transaction(async (manager) => {
      const production = await lockProduction(manager, id);
      await cancelOrder(manager, production.order.id);
      return manager.findOneOrFail(Production, {
        where: { id },
        relations: { order: true },
      });
    });
  }

  async remove(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const production = await lockProduction(manager, id);
      await assertCancellable(manager, production.order);
      if (production.status !== 'PENDING')
        throw new BadRequestException(
          'Only pending productions can be deleted',
        );
      await manager.remove(Production, production);
    });
  }
}
