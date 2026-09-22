import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, Repository } from 'typeorm';

import { Purchase } from './entities/purchase.entity';

import { CreatePurchaseDto } from './dto/create-purchase.dto';

import { UpdatePurchaseDto } from './dto/update-purchase.dto';

import { Supplier } from '../suppliers/entities/supplier.entity';

import { PurchaseItem } from '../purchase-items/entities/purchase-item.entity';

import { Inventory } from '../inventory/entities/inventory.entity';

import { InventoryMovement } from '../inventory-movements/entities/inventory-movement.entity';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,

    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,

    @InjectRepository(PurchaseItem)
    private readonly purchaseItemRepository: Repository<PurchaseItem>,

    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,

    @InjectRepository(InventoryMovement)
    private readonly inventoryMovementRepository: Repository<InventoryMovement>,

    private readonly dataSource: DataSource,
  ) {}

  async create(
    createPurchaseDto: CreatePurchaseDto,
  ): Promise<Purchase> {
    const supplier =
      await this.supplierRepository.findOne({
        where: {
          id: createPurchaseDto.supplierId,
        },
      });

    if (!supplier) {
      throw new NotFoundException(
        'Supplier not found',
      );
    }

    const purchase =
      this.purchaseRepository.create({
        supplier,
        purchaseDate:
          createPurchaseDto.purchaseDate,
        status:
          createPurchaseDto.status ?? 'PENDING',
        notes:
          createPurchaseDto.notes ?? null,
      });

    return this.purchaseRepository.save(
      purchase,
    );
  }

  async findAll(): Promise<Purchase[]> {
    return this.purchaseRepository.find({
      relations: {
        supplier: true,
        items: {
          productUnit: {
            product: true,
            unit: true,
          },
        },
      },
    });
  }

  async findOne(
    id: string,
  ): Promise<Purchase> {
    const purchase =
      await this.purchaseRepository.findOne({
        where: { id },
        relations: {
          supplier: true,
          items: {
            productUnit: {
              product: true,
              unit: true,
            },
          },
        },
      });

    if (!purchase) {
      throw new NotFoundException(
        'Purchase not found',
      );
    }

    return purchase;
  }

  async update(
    id: string,
    updatePurchaseDto: UpdatePurchaseDto,
  ): Promise<Purchase> {
    const purchase =
      await this.findOne(id);

    if (purchase.status !== 'PENDING') {
      throw new BadRequestException(
        'Only PENDING purchases can be updated',
      );
    }

    if (updatePurchaseDto.supplierId) {
      const supplier =
        await this.supplierRepository.findOne({
          where: {
            id: updatePurchaseDto.supplierId,
          },
        });

      if (!supplier) {
        throw new NotFoundException(
          'Supplier not found',
        );
      }

      purchase.supplier = supplier;
    }

    if (
      updatePurchaseDto.purchaseDate !==
      undefined
    ) {
      purchase.purchaseDate =
        updatePurchaseDto.purchaseDate;
    }

    if (
      updatePurchaseDto.notes !==
      undefined
    ) {
      purchase.notes =
        updatePurchaseDto.notes;
    }

    return this.purchaseRepository.save(
      purchase,
    );
  }

  async completePurchase(
    id: string,
  ): Promise<Purchase> {
    return this.dataSource.transaction(
      async (manager) => {
        const purchase =
          await manager.findOne(Purchase, {
            where: { id },
            relations: {
              supplier: true,
            },
          });

        if (!purchase) {
          throw new NotFoundException(
            'Purchase not found',
          );
        }

        if (purchase.status === 'COMPLETED') {
          throw new BadRequestException(
            'Purchase is already completed',
          );
        }

        if (purchase.status === 'CANCELLED') {
          throw new BadRequestException(
            'Cancelled purchase cannot be completed',
          );
        }

        const items =
          await manager.find(PurchaseItem, {
            where: {
              purchase: {
                id: purchase.id,
              },
            },
            relations: {
              productUnit: true,
            },
          });

        if (items.length === 0) {
          throw new BadRequestException(
            'Purchase must have at least one item',
          );
        }

        for (const item of items) {
          if (!item.productUnit.trackStock) {
            continue;
          }

          let inventory =
            await manager.findOne(Inventory, {
              where: {
                productUnit: {
                  id: item.productUnit.id,
                },
              },
              relations: {
                productUnit: true,
              },
            });

          if (!inventory) {
            inventory = manager.create(
              Inventory,
              {
                productUnit:
                  item.productUnit,
                quantity: item.quantity,
              },
            );
          } else {
            inventory.quantity =
              Number(inventory.quantity) +
              Number(item.quantity);
          }

          await manager.save(
            Inventory,
            inventory,
          );

          const movement =
            manager.create(
              InventoryMovement,
              {
                inventory,
                type: 'IN',
                quantity: item.quantity,
                reason: 'PURCHASE',
                referenceId: purchase.id,
              },
            );

          await manager.save(
            InventoryMovement,
            movement,
          );
        }

        purchase.status = 'COMPLETED';

        return manager.save(
          Purchase,
          purchase,
        );
      },
    );
  }

  async remove(
    id: string,
  ): Promise<void> {
    const purchase =
      await this.findOne(id);

    if (purchase.status !== 'PENDING') {
      throw new BadRequestException(
        'Only PENDING purchases can be deleted',
      );
    }

    await this.purchaseRepository.remove(
      purchase,
    );
  }
}