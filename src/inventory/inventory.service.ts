import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Inventory } from './entities/inventory.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

import { ProductUnit } from '../product-units/entities/product-unit.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,

    @InjectRepository(ProductUnit)
    private readonly productUnitRepository: Repository<ProductUnit>,
  ) {}

  async create(
    createInventoryDto: CreateInventoryDto,
  ): Promise<Inventory> {
    const productUnit = await this.productUnitRepository.findOne({
      where: {
        id: createInventoryDto.productUnitId,
      },
      relations: {
        product: true,
        unit: true,
      },
    });

    if (!productUnit) {
      throw new NotFoundException(
        'ProductUnit not found',
      );
    }

    if (!productUnit.trackStock) {
      throw new BadRequestException(
        'This ProductUnit does not track stock',
      );
    }

    const existingInventory =
      await this.inventoryRepository.findOne({
        where: {
          productUnit: {
            id: createInventoryDto.productUnitId,
          },
        },
      });

    if (existingInventory) {
      throw new ConflictException(
        'Inventory already exists for this ProductUnit',
      );
    }

    const inventory = this.inventoryRepository.create({
      productUnit,
      quantity: createInventoryDto.quantity,
    });

    return this.inventoryRepository.save(inventory);
  }

  async findAll(): Promise<Inventory[]> {
    return this.inventoryRepository.find({
      relations: {
        productUnit: {
          product: true,
          unit: true,
        },
      },
    });
  }

  async findOne(id: string): Promise<Inventory> {
    const inventory =
      await this.inventoryRepository.findOne({
        where: { id },
        relations: {
          productUnit: {
            product: true,
            unit: true,
          },
        },
      });

    if (!inventory) {
      throw new NotFoundException(
        'Inventory not found',
      );
    }

    return inventory;
  }

  async update(
    id: string,
    updateInventoryDto: UpdateInventoryDto,
  ): Promise<Inventory> {
    const inventory = await this.findOne(id);

    if (
      updateInventoryDto.productUnitId &&
      updateInventoryDto.productUnitId !==
        inventory.productUnit.id
    ) {
      const productUnit =
        await this.productUnitRepository.findOne({
          where: {
            id: updateInventoryDto.productUnitId,
          },
          relations: {
            product: true,
            unit: true,
          },
        });

      if (!productUnit) {
        throw new NotFoundException(
          'ProductUnit not found',
        );
      }

      if (!productUnit.trackStock) {
        throw new BadRequestException(
          'This ProductUnit does not track stock',
        );
      }

      const existingInventory =
        await this.inventoryRepository.findOne({
          where: {
            productUnit: {
              id: updateInventoryDto.productUnitId,
            },
          },
        });

      if (
        existingInventory &&
        existingInventory.id !== inventory.id
      ) {
        throw new ConflictException(
          'Inventory already exists for this ProductUnit',
        );
      }

      inventory.productUnit = productUnit;
    }

    if (updateInventoryDto.quantity !== undefined) {
      inventory.quantity =
        updateInventoryDto.quantity;
    }

    return this.inventoryRepository.save(inventory);
  }

  async remove(id: string): Promise<void> {
    const inventory = await this.findOne(id);

    await this.inventoryRepository.remove(inventory);
  }
}