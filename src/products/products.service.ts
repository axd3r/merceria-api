import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(
    data: CreateProductDto,
  ): Promise<Product> {
    const category =
      await this.categoriesRepository.findOneBy({
        id: data.categoryId,
      });

    if (!category) {
      throw new NotFoundException(
        `Category with id ${data.categoryId} not found`,
      );
    }

    const product = this.productsRepository.create({
      name: data.name,
      slug: data.slug,
      description: data.description,
      brand: data.brand,
      status: data.status,
      category,
    });

    return this.productsRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return this.productsRepository.find({
      relations: {
        category: true,
      },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product =
      await this.productsRepository.findOne({
        where: { id },
        relations: {
          category: true,
        },
      });

    if (!product) {
      throw new NotFoundException(
        `Product with id ${id} not found`,
      );
    }

    return product;
  }

  async update(
    id: string,
    data: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);

    if (data.categoryId) {
      const category =
        await this.categoriesRepository.findOneBy({
          id: data.categoryId,
        });

      if (!category) {
        throw new NotFoundException(
          `Category with id ${data.categoryId} not found`,
        );
      }

      product.category = category;
    }

    Object.assign(product, {
      name: data.name,
      slug: data.slug,
      description: data.description,
      brand: data.brand,
      status: data.status,
    });

    return this.productsRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    await this.productsRepository.delete(id);
  }
}