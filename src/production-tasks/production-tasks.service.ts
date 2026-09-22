import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import {
  DataSource,
  Repository,
} from 'typeorm';

import { ProductionTask } from './entities/production-task.entity';

import { Production } from '../productions/entities/production.entity';

import { ServiceProvider } from '../service-providers/entities/service-provider.entity';

import { CreateProductionTaskDto } from './dto/create-production-task.dto';

import { UpdateProductionTaskDto } from './dto/update-production-task.dto';

@Injectable()
export class ProductionTasksService {
  constructor(
    @InjectRepository(ProductionTask)
    private readonly productionTaskRepository: Repository<ProductionTask>,

    @InjectRepository(Production)
    private readonly productionRepository: Repository<Production>,

    @InjectRepository(ServiceProvider)
    private readonly serviceProviderRepository: Repository<ServiceProvider>,

    private readonly dataSource: DataSource,
  ) {}

  async create(
    createProductionTaskDto: CreateProductionTaskDto,
  ): Promise<ProductionTask> {
    return this.dataSource.transaction(
      async (manager) => {
        const production =
          await manager.findOne(
            Production,
            {
              where: {
                id: createProductionTaskDto.productionId,
              },
            },
          );

        if (!production) {
          throw new NotFoundException(
            'Production not found',
          );
        }

        if (production.status !== 'PENDING') {
          throw new BadRequestException(
            'Tasks can only be added to pending productions',
          );
        }

        const serviceProvider =
          await manager.findOne(
            ServiceProvider,
            {
              where: {
                id:
                  createProductionTaskDto.serviceProviderId,
              },
            },
          );

        if (!serviceProvider) {
          throw new NotFoundException(
            'Service provider not found',
          );
        }

        const quantity =
          Number(
            createProductionTaskDto.quantity,
          );

        const unitCost =
          Number(
            createProductionTaskDto.unitCost,
          );

        const subtotal =
          quantity * unitCost;

        const task =
          manager.create(
            ProductionTask,
            {
              production,
              serviceProvider,
              description:
                createProductionTaskDto.description,
              quantity,
              unitCost,
              subtotal,
              status: 'PENDING',
            },
          );

        return manager.save(
          ProductionTask,
          task,
        );
      },
    );
  }

  async findAll(): Promise<ProductionTask[]> {
    return this.productionTaskRepository.find({
      relations: {
        production: {
          order: true,
        },
        serviceProvider: true,
      },
    });
  }

  async findOne(
    id: string,
  ): Promise<ProductionTask> {
    const task =
      await this.productionTaskRepository.findOne({
        where: {
          id,
        },
        relations: {
          production: {
            order: true,
          },
          serviceProvider: true,
        },
      });

    if (!task) {
      throw new NotFoundException(
        'Production task not found',
      );
    }

    return task;
  }

  async update(
    id: string,
    updateProductionTaskDto: UpdateProductionTaskDto,
  ): Promise<ProductionTask> {
    return this.dataSource.transaction(
      async (manager) => {
        const task =
          await manager.findOne(
            ProductionTask,
            {
              where: {
                id,
              },
                relations: {
                  production: true,
                },
            },
          );

        if (!task) {
          throw new NotFoundException(
            'Production task not found',
          );
        }

        if (
          task.production.status !==
          'PENDING'
        ) {
          throw new BadRequestException(
            'Only tasks from pending productions can be modified',
          );
        }

        if (
          updateProductionTaskDto.description !==
          undefined
        ) {
          task.description =
            updateProductionTaskDto.description;
        }

        if (
          updateProductionTaskDto.quantity !==
          undefined
        ) {
          task.quantity =
            Number(
              updateProductionTaskDto.quantity,
            );
        }

        if (
          updateProductionTaskDto.unitCost !==
          undefined
        ) {
          task.unitCost =
            Number(
              updateProductionTaskDto.unitCost,
            );
        }

        task.subtotal =
          Number(task.quantity) *
          Number(task.unitCost);

        return manager.save(
          ProductionTask,
          task,
        );
      },
    );
  }

  async start(
    id: string,
  ): Promise<ProductionTask> {
    const task =
      await this.findOne(id);

    if (
      task.production.status !==
      'IN_PROGRESS'
    ) {
      throw new BadRequestException(
        'Production must be in progress',
      );
    }

    if (task.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending tasks can be started',
      );
    }

    task.status = 'IN_PROGRESS';

    return this.productionTaskRepository.save(
      task,
    );
  }

  async complete(
    id: string,
  ): Promise<ProductionTask> {
    const task =
      await this.findOne(id);

    if (
      task.production.status !==
      'IN_PROGRESS'
    ) {
      throw new BadRequestException(
        'Production must be in progress',
      );
    }

    if (task.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Only tasks in progress can be completed',
      );
    }

    task.status = 'COMPLETED';

    return this.productionTaskRepository.save(
      task,
    );
  }

  async cancel(
    id: string,
  ): Promise<ProductionTask> {
    const task =
      await this.findOne(id);

    if (
      task.status === 'COMPLETED' ||
      task.status === 'CANCELLED'
    ) {
      throw new BadRequestException(
        'This task cannot be cancelled',
      );
    }

    if (
      task.production.status ===
      'COMPLETED'
    ) {
      throw new BadRequestException(
        'Tasks from completed productions cannot be cancelled',
      );
    }

    task.status = 'CANCELLED';

    return this.productionTaskRepository.save(
      task,
    );
  }

  async remove(
    id: string,
  ): Promise<void> {
    const task =
      await this.findOne(id);

    if (
      task.production.status !==
      'PENDING'
    ) {
      throw new BadRequestException(
        'Only tasks from pending productions can be deleted',
      );
    }

    await this.productionTaskRepository.remove(
      task,
    );
  }
}