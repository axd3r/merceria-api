import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
} from 'typeorm';

import { QuoteItem } from './entities/quote-item.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { ProductUnit } from '../product-units/entities/product-unit.entity';

import { CreateQuoteItemDto } from './dto/create-quote-item.dto';
import { UpdateQuoteItemDto } from './dto/update-quote-item.dto';

@Injectable()
export class QuoteItemsService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(QuoteItem)
    private readonly quoteItemRepository: Repository<QuoteItem>,

    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,

    @InjectRepository(ProductUnit)
    private readonly productUnitRepository: Repository<ProductUnit>,
  ) {}

  async create(
    createQuoteItemDto: CreateQuoteItemDto,
  ): Promise<QuoteItem> {
    return this.dataSource.transaction(
      async (manager) => {
        const quote =
          await manager.findOne(Quote, {
            where: {
              id: createQuoteItemDto.quoteId,
            },
          });

        if (!quote) {
          throw new NotFoundException(
            'Quote not found',
          );
        }

        if (quote.status !== 'DRAFT') {
          throw new BadRequestException(
            'Only draft quotes can be modified',
          );
        }

        let productUnit:
          | ProductUnit
          | null = null;

        if (
          createQuoteItemDto.itemType ===
          'PRODUCT'
        ) {
          if (
            !createQuoteItemDto.productUnitId
          ) {
            throw new BadRequestException(
              'productUnitId is required for product items',
            );
          }

          productUnit =
            await manager.findOne(
              ProductUnit,
              {
                where: {
                  id:
                    createQuoteItemDto.productUnitId,
                },
                relations: {
                  product: true,
                  unit: true,
                },
              },
            );

          if (!productUnit) {
            throw new NotFoundException(
              'Product unit not found',
            );
          }

          if (!productUnit.isSaleUnit) {
            throw new BadRequestException(
              'Product unit is not configured for sale',
            );
          }
        }

        if (
          createQuoteItemDto.itemType ===
            'CUSTOM' &&
          createQuoteItemDto.productUnitId
        ) {
          throw new BadRequestException(
            'Custom items cannot have a product unit',
          );
        }

        const quantity =
          Number(
            createQuoteItemDto.quantity,
          );

        const unitPrice =
          Number(
            createQuoteItemDto.unitPrice,
          );

        const subtotal =
          quantity * unitPrice;

        const quoteItem =
          manager.create(QuoteItem, {
            quote,
            productUnit,
            itemType:
              createQuoteItemDto.itemType,
            description:
              createQuoteItemDto.description,
            quantity,
            unitPrice,
            subtotal,
          });

        const savedItem =
          await manager.save(
            QuoteItem,
            quoteItem,
          );

        await this.recalculateQuote(
          manager,
          quote.id,
        );

        return savedItem;
      },
    );
  }

  async findAll(): Promise<QuoteItem[]> {
    return this.quoteItemRepository.find({
      relations: {
        quote: true,
        productUnit: {
          product: true,
          unit: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(
    id: string,
  ): Promise<QuoteItem> {
    const quoteItem =
      await this.quoteItemRepository.findOne({
        where: { id },
        relations: {
          quote: true,
          productUnit: {
            product: true,
            unit: true,
          },
        },
      });

    if (!quoteItem) {
      throw new NotFoundException(
        'Quote item not found',
      );
    }

    return quoteItem;
  }

  async update(
    id: string,
    updateQuoteItemDto: UpdateQuoteItemDto,
  ): Promise<QuoteItem> {
    return this.dataSource.transaction(
      async (manager) => {
        const quoteItem =
          await manager.findOne(
            QuoteItem,
            {
              where: { id },
              relations: {
                quote: true,
                productUnit: true,
              },
            },
          );

        if (!quoteItem) {
          throw new NotFoundException(
            'Quote item not found',
          );
        }

        if (
          quoteItem.quote.status !==
          'DRAFT'
        ) {
          throw new BadRequestException(
            'Only draft quotes can be modified',
          );
        }

        if (
          updateQuoteItemDto.description !==
          undefined
        ) {
          quoteItem.description =
            updateQuoteItemDto.description;
        }

        if (
          updateQuoteItemDto.quantity !==
          undefined
        ) {
          quoteItem.quantity =
            Number(
              updateQuoteItemDto.quantity,
            );
        }

        if (
          updateQuoteItemDto.unitPrice !==
          undefined
        ) {
          quoteItem.unitPrice =
            Number(
              updateQuoteItemDto.unitPrice,
            );
        }

        quoteItem.subtotal =
          Number(quoteItem.quantity) *
          Number(quoteItem.unitPrice);

        const savedItem =
          await manager.save(
            QuoteItem,
            quoteItem,
          );

        await this.recalculateQuote(
          manager,
          quoteItem.quote.id,
        );

        return savedItem;
      },
    );
  }

  async remove(
    id: string,
  ): Promise<void> {
    await this.dataSource.transaction(
      async (manager) => {
        const quoteItem =
          await manager.findOne(
            QuoteItem,
            {
              where: { id },
              relations: {
                quote: true,
              },
            },
          );

        if (!quoteItem) {
          throw new NotFoundException(
            'Quote item not found',
          );
        }

        if (
          quoteItem.quote.status !==
          'DRAFT'
        ) {
          throw new BadRequestException(
            'Only draft quotes can be modified',
          );
        }

        const quoteId =
          quoteItem.quote.id;

        await manager.remove(
          QuoteItem,
          quoteItem,
        );

        await this.recalculateQuote(
          manager,
          quoteId,
        );
      },
    );
  }

  private async recalculateQuote(
    manager: EntityManager,
    quoteId: string,
  ): Promise<void> {
    const quote =
      await manager.findOne(
        Quote,
        {
          where: {
            id: quoteId,
          },
        },
      );

    if (!quote) {
      throw new NotFoundException(
        'Quote not found',
      );
    }

    const items =
      await manager.find(
        QuoteItem,
        {
          where: {
            quote: {
              id: quoteId,
            },
          },
        },
      );

    const subtotal =
      items.reduce(
        (sum, item) =>
          sum +
          Number(item.subtotal),
        0,
      );

    const discount =
      Number(quote.discount);

    if (discount > subtotal) {
      throw new BadRequestException(
        'Discount cannot be greater than subtotal',
      );
    }

    quote.subtotal = subtotal;

    quote.total =
      subtotal - discount;

    await manager.save(
      Quote,
      quote,
    );
  }
}