import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateProductUnitDto } from './dto/create-product-unit.dto';
import { UpdateProductUnitDto } from './dto/update-product-unit.dto';
import { ProductUnit } from './entities/product-unit.entity';

import { Product } from '../products/entities/product.entity';
import { Unit } from '../units/entities/unit.entity';

@Injectable()
export class ProductUnitsService {
  constructor(
    @InjectRepository(ProductUnit)
    private readonly productUnitsRepository: Repository<ProductUnit>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(Unit)
    private readonly unitsRepository: Repository<Unit>,
  ) {}

  async create(
    data: CreateProductUnitDto,
  ): Promise<ProductUnit> {
    const product =
      await this.productsRepository.findOneBy({
        id: data.productId,
      });

    if (!product) {
      throw new NotFoundException(
        `Product with id ${data.productId} not found`,
      );
    }

    const unit =
      await this.unitsRepository.findOneBy({
        id: data.unitId,
      });

    if (!unit) {
      throw new NotFoundException(
        `Unit with id ${data.unitId} not found`,
      );
    }

    const productUnit =
      this.productUnitsRepository.create({
        product,
        unit,
        conversionFactor: data.conversionFactor,
        price: data.price,
        trackStock: data.trackStock,
        isPurchaseUnit: data.isPurchaseUnit,
        isSaleUnit: data.isSaleUnit,
      });
    return this.productUnitsRepository.save(productUnit);
  }

  async findAll(): Promise<ProductUnit[]> {
    return this.productUnitsRepository.find({
      relations: {
        product: true,
        unit: true,
      },
    });
  }

  async findOne(id: string): Promise<ProductUnit> {
    const productUnit =
      await this.productUnitsRepository.findOne({
        where: { id },
        relations: {
          product: true,
          unit: true,
        },
      });

    if (!productUnit) {
      throw new NotFoundException(
        `ProductUnit with id ${id} not found`,
      );
    }

    return productUnit;
  }

  async update(
    id: string,
    data: UpdateProductUnitDto,
  ): Promise<ProductUnit> {
    const productUnit = await this.findOne(id);

    if (data.productId) {
      const product =
        await this.productsRepository.findOneBy({
          id: data.productId,
        });

      if (!product) {
        throw new NotFoundException(
          `Product with id ${data.productId} not found`,
        );
      }

      productUnit.product = product;
    }

    if (data.unitId) {
      const unit =
        await this.unitsRepository.findOneBy({
          id: data.unitId,
        });

      if (!unit) {
        throw new NotFoundException(
          `Unit with id ${data.unitId} not found`,
        );
      }

      productUnit.unit = unit;
    }

    Object.assign(productUnit, {
      conversionFactor: data.conversionFactor,
      price: data.price,
      trackStock: data.trackStock,
      isPurchaseUnit: data.isPurchaseUnit,
      isSaleUnit: data.isSaleUnit,
    });

    return this.productUnitsRepository.save(productUnit);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    await this.productUnitsRepository.delete(id);
  }
}