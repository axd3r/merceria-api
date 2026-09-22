import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository, DataSource } from 'typeorm';

import { InventoryMovement } from './entities/inventory-movement.entity';

import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';

import { Inventory } from '../inventory/entities/inventory.entity';

@Injectable()
export class InventoryMovementsService {
  constructor(
    @InjectRepository(InventoryMovement)
    private readonly inventoryMovementRepository: Repository<InventoryMovement>,

    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,

    private readonly dataSource: DataSource,
  ) {}

  async create(
    createInventoryMovementDto: CreateInventoryMovementDto,
  ): Promise<InventoryMovement> {
    return this.dataSource.transaction(
      async (manager) => {
        const inventory =
          await manager.findOne(Inventory, {
            where: {
              id: createInventoryMovementDto.inventoryId,
            },
            relations: {
              productUnit: true,
            },
          });

        if (!inventory) {
          throw new NotFoundException(
            'Inventory not found',
          );
        }

        const quantity =
          Number(createInventoryMovementDto.quantity);

        const previousQuantity =
          Number(inventory.quantity);

        let newQuantity: number;

        if (
          createInventoryMovementDto.type === 'IN'
        ) {
          newQuantity =
            previousQuantity + quantity;
        } else if (
          createInventoryMovementDto.type === 'OUT'
        ) {
          if (previousQuantity < quantity) {
            throw new BadRequestException(
              'Insufficient inventory',
            );
          }

          newQuantity =
            previousQuantity - quantity;
        } else {
          newQuantity = quantity;
        }

        inventory.quantity = newQuantity;

        await manager.save(
          Inventory,
          inventory,
        );

        const movement =
          manager.create(
            InventoryMovement,
            {
              inventory,
              type:
                createInventoryMovementDto.type,
              quantity,
              previousQuantity,
              newQuantity,
              reason:
                createInventoryMovementDto.reason,
              referenceId:
                createInventoryMovementDto.referenceId ??
                null,
            },
          );

        return manager.save(
          InventoryMovement,
          movement,
        );
      },
    );
  }

  async findAll(): Promise<InventoryMovement[]> {
    return this.inventoryMovementRepository.find({
      relations: {
        inventory: {
          productUnit: {
            product: true,
            unit: true,
          },
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(
    id: string,
  ): Promise<InventoryMovement> {
    const movement =
      await this.inventoryMovementRepository.findOne({
        where: {
          id,
        },
        relations: {
          inventory: {
            productUnit: {
              product: true,
              unit: true,
            },
          },
        },
      });

    if (!movement) {
      throw new NotFoundException(
        'Inventory movement not found',
      );
    }

    return movement;
  }
}