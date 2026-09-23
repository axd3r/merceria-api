import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ProductionTask } from './entities/production-task.entity';
import { Production } from '../productions/entities/production.entity';
import { ServiceProvider } from '../service-providers/entities/service-provider.entity';
import { CreateProductionTaskDto } from './dto/create-production-task.dto';
import { UpdateProductionTaskDto } from './dto/update-production-task.dto';
import { lockProduction } from '../common/order-workflow';

@Injectable()
export class ProductionTasksService {
  constructor(
    @InjectRepository(ProductionTask)
    private readonly taskRepository: Repository<ProductionTask>,
    private readonly dataSource: DataSource,
  ) {}
  private assertOrder(production: Production) {
    if (['CANCELLED', 'DELIVERED'].includes(production.order.status))
      throw new BadRequestException(
        'Order no longer allows production changes',
      );
  }
  async create(dto: CreateProductionTaskDto): Promise<ProductionTask> {
    return this.dataSource.transaction(async (manager) => {
      const production = await lockProduction(manager, dto.productionId);
      this.assertOrder(production);
      if (production.status !== 'PENDING')
        throw new BadRequestException(
          'Tasks can only be added to pending productions',
        );
      const serviceProvider = await manager.findOne(ServiceProvider, {
        where: { id: dto.serviceProviderId },
      });
      if (!serviceProvider)
        throw new NotFoundException('Service provider not found');
      return manager.save(
        ProductionTask,
        manager.create(ProductionTask, {
          production,
          serviceProvider,
          description: dto.description,
          quantity: dto.quantity,
          unitCost: dto.unitCost,
          subtotal: Number((dto.quantity * dto.unitCost).toFixed(2)),
          status: 'PENDING',
        }),
      );
    });
  }
  findAll() {
    return this.taskRepository.find({
      relations: { production: { order: true }, serviceProvider: true },
    });
  }
  async findOne(id: string) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: { production: { order: true }, serviceProvider: true },
    });
    if (!task) throw new NotFoundException('Production task not found');
    return task;
  }
  private async lockedTask(manager: EntityManager, id: string) {
    const linked = await manager.findOne(ProductionTask, {
      where: { id },
      relations: { production: true },
    });
    if (!linked) throw new NotFoundException('Production task not found');
    const production = await lockProduction(manager, linked.production.id);
    this.assertOrder(production);
    const task = await manager.findOne(ProductionTask, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!task) throw new NotFoundException('Production task not found');
    task.production = production;
    return task;
  }
  async update(id: string, dto: UpdateProductionTaskDto) {
    return this.dataSource.transaction(async (manager) => {
      const task = await this.lockedTask(manager, id);
      if (task.production.status !== 'PENDING')
        throw new BadRequestException(
          'Only tasks from pending productions can be modified',
        );
      if (dto.description !== undefined) task.description = dto.description;
      if (dto.quantity !== undefined) task.quantity = dto.quantity;
      if (dto.unitCost !== undefined) task.unitCost = dto.unitCost;
      task.subtotal = Number(
        (Number(task.quantity) * Number(task.unitCost)).toFixed(2),
      );
      return manager.save(ProductionTask, task);
    });
  }
  private async transition(id: string, from: string, to: string) {
    return this.dataSource.transaction(async (manager) => {
      const task = await this.lockedTask(manager, id);
      if (task.production.status !== 'IN_PROGRESS')
        throw new BadRequestException('Production must be in progress');
      if (task.status !== from)
        throw new BadRequestException(`Task must be ${from}`);
      task.status = to;
      return manager.save(ProductionTask, task);
    });
  }
  start(id: string) {
    return this.transition(id, 'PENDING', 'IN_PROGRESS');
  }
  complete(id: string) {
    return this.transition(id, 'IN_PROGRESS', 'COMPLETED');
  }
  async cancel(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const task = await this.lockedTask(manager, id);
      if (task.production.status !== 'PENDING' || task.status !== 'PENDING')
        throw new BadRequestException(
          'Only planned tasks can be cancelled before production starts',
        );
      task.status = 'CANCELLED';
      return manager.save(ProductionTask, task);
    });
  }
  async remove(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const task = await this.lockedTask(manager, id);
      if (task.production.status !== 'PENDING')
        throw new BadRequestException(
          'Only tasks from pending productions can be deleted',
        );
      await manager.remove(ProductionTask, task);
    });
  }
}
