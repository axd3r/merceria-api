import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PurchaseItem } from './entities/purchase-item.entity';
import { CreatePurchaseItemDto } from './dto/create-purchase-item.dto';
import { UpdatePurchaseItemDto } from './dto/update-purchase-item.dto';

import { Purchase } from '../purchases/entities/purchase.entity';
import { ProductUnit } from '../product-units/entities/product-unit.entity';

@Injectable()
export class PurchaseItemsService {
  constructor(
    @InjectRepository(PurchaseItem)
    private readonly purchaseItemRepository: Repository<PurchaseItem>,

    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,

    @InjectRepository(ProductUnit)
    private readonly productUnitRepository: Repository<ProductUnit>,
  ) {}

  async create(
    createPurchaseItemDto: CreatePurchaseItemDto,
  ): Promise<PurchaseItem> {
    const purchase =
      await this.purchaseRepository.findOne({
        where: {
          id: createPurchaseItemDto.purchaseId,
        },
      });

    if (!purchase) {
      throw new NotFoundException(
        'Purchase not found',
      );
    }

    if (purchase.status !== 'PENDING') {
      throw new BadRequestException(
        'Only PENDING purchases can receive items',
      );
    }

    const productUnit =
      await this.productUnitRepository.findOne({
        where: {
          id: createPurchaseItemDto.productUnitId,
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

    if (!productUnit.isPurchaseUnit) {
      throw new BadRequestException(
        'This ProductUnit is not configured as a purchase unit',
      );
    }

    const subtotal =
      createPurchaseItemDto.quantity *
      createPurchaseItemDto.unitCost;

    const purchaseItem =
      this.purchaseItemRepository.create({
        purchase,
        productUnit,
        quantity:
          createPurchaseItemDto.quantity,
        unitCost:
          createPurchaseItemDto.unitCost,
        subtotal,
      });

    return this.purchaseItemRepository.save(
      purchaseItem,
    );
  }

  async findAll(): Promise<PurchaseItem[]> {
    return this.purchaseItemRepository.find({
      relations: {
        purchase: true,
        productUnit: {
          product: true,
          unit: true,
        },
      },
    });
  }

  async findOne(
    id: string,
  ): Promise<PurchaseItem> {
    const purchaseItem =
      await this.purchaseItemRepository.findOne({
        where: { id },
        relations: {
          purchase: true,
          productUnit: {
            product: true,
            unit: true,
          },
        },
      });

    if (!purchaseItem) {
      throw new NotFoundException(
        'PurchaseItem not found',
      );
    }

    return purchaseItem;
  }

  async update(
    id: string,
    updatePurchaseItemDto: UpdatePurchaseItemDto,
  ): Promise<PurchaseItem> {
    const purchaseItem =
      await this.findOne(id);

    if (purchaseItem.purchase.status !== 'PENDING') {
      throw new BadRequestException(
        'Only items from PENDING purchases can be updated',
      );
    }

    if (
      updatePurchaseItemDto.purchaseId &&
      updatePurchaseItemDto.purchaseId !==
        purchaseItem.purchase.id
    ) {
      const purchase =
        await this.purchaseRepository.findOne({
          where: {
            id: updatePurchaseItemDto.purchaseId,
          },
        });

      if (!purchase) {
        throw new NotFoundException(
          'Purchase not found',
        );
      }

      if (purchase.status !== 'PENDING') {
        throw new BadRequestException(
          'Items can only be moved to a PENDING purchase',
        );
      }

      purchaseItem.purchase = purchase;
    }

    if (
      updatePurchaseItemDto.productUnitId &&
      updatePurchaseItemDto.productUnitId !==
        purchaseItem.productUnit.id
    ) {
      const productUnit =
        await this.productUnitRepository.findOne({
          where: {
            id: updatePurchaseItemDto.productUnitId,
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

      if (!productUnit.isPurchaseUnit) {
        throw new BadRequestException(
          'This ProductUnit is not configured as a purchase unit',
        );
      }

      purchaseItem.productUnit =
        productUnit;
    }

    if (
      updatePurchaseItemDto.quantity !==
      undefined
    ) {
      purchaseItem.quantity =
        updatePurchaseItemDto.quantity;
    }

    if (
      updatePurchaseItemDto.unitCost !==
      undefined
    ) {
      purchaseItem.unitCost =
        updatePurchaseItemDto.unitCost;
    }

    purchaseItem.subtotal =
      Number(purchaseItem.quantity) *
      Number(purchaseItem.unitCost);

    return this.purchaseItemRepository.save(
      purchaseItem,
    );
  }

  async remove(id: string): Promise<void> {
    const purchaseItem =
      await this.findOne(id);

    if (purchaseItem.purchase.status !== 'PENDING') {
      throw new BadRequestException(
        'Only items from PENDING purchases can be deleted',
      );
    }

    await this.purchaseItemRepository.remove(
      purchaseItem,
    );
  }
}