import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Quote } from './entities/quote.entity';
import { Customer } from '../customers/entities/customer.entity';

import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,

    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async create(
    createQuoteDto: CreateQuoteDto,
  ): Promise<Quote> {
    const customer =
      await this.customerRepository.findOne({
        where: {
          id: createQuoteDto.customerId,
        },
      });

    if (!customer) {
      throw new NotFoundException(
        'Customer not found',
      );
    }

    if (
      createQuoteDto.validUntil &&
      createQuoteDto.validUntil <
        createQuoteDto.quoteDate
    ) {
      throw new BadRequestException(
        'validUntil cannot be before quoteDate',
      );
    }

    const quote =
      this.quoteRepository.create({
        customer,
        quoteDate:
          createQuoteDto.quoteDate,
        validUntil:
          createQuoteDto.validUntil ?? null,
        status: 'DRAFT',
        subtotal: 0,
        discount: 0,
        total: 0,
        notes:
          createQuoteDto.notes ?? null,
      });

    return this.quoteRepository.save(
      quote,
    );
  }

  async findAll(): Promise<Quote[]> {
    return this.quoteRepository.find({
      relations: {
        customer: true,
        items: {
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
  ): Promise<Quote> {
    const quote =
      await this.quoteRepository.findOne({
        where: { id },
        relations: {
          customer: true,
          items: {
            productUnit: {
              product: true,
              unit: true,
            },
          },
        },
      });

    if (!quote) {
      throw new NotFoundException(
        'Quote not found',
      );
    }

    return quote;
  }

  async update(
    id: string,
    updateQuoteDto: UpdateQuoteDto,
  ): Promise<Quote> {
    const quote =
      await this.quoteRepository.findOne({
        where: { id },
        relations: {
          items: true,
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

    if (
      updateQuoteDto.customerId
    ) {
      const customer =
        await this.customerRepository.findOne({
          where: {
            id: updateQuoteDto.customerId,
          },
        });

      if (!customer) {
        throw new NotFoundException(
          'Customer not found',
        );
      }

      quote.customer = customer;
    }

    if (
      updateQuoteDto.quoteDate !==
      undefined
    ) {
      quote.quoteDate =
        updateQuoteDto.quoteDate;
    }

    if (
      updateQuoteDto.validUntil !==
      undefined
    ) {
      quote.validUntil =
        updateQuoteDto.validUntil ?? null;
    }

    if (
      updateQuoteDto.notes !==
      undefined
    ) {
      quote.notes =
        updateQuoteDto.notes ?? null;
    }

    if (
      updateQuoteDto.discount !==
      undefined
    ) {
      quote.discount =
        Number(updateQuoteDto.discount);
    }

    if (
      quote.validUntil &&
      quote.validUntil <
        quote.quoteDate
    ) {
      throw new BadRequestException(
        'validUntil cannot be before quoteDate',
      );
    }

    const subtotal =
      quote.items.reduce(
        (sum, item) =>
          sum +
          Number(item.subtotal),
        0,
      );

    if (quote.discount > subtotal) {
      throw new BadRequestException(
        'Discount cannot be greater than subtotal',
      );
    }

    quote.subtotal = subtotal;

    quote.total =
      subtotal -
      Number(quote.discount);

    return this.quoteRepository.save(
      quote,
    );
  }

  async remove(
    id: string,
  ): Promise<void> {
    const quote =
      await this.quoteRepository.findOne({
        where: { id },
      });

    if (!quote) {
      throw new NotFoundException(
        'Quote not found',
      );
    }

    if (quote.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft quotes can be deleted',
      );
    }

    await this.quoteRepository.remove(
      quote,
    );
  }

  async send(id: string): Promise<Quote> {
    const quote =
      await this.quoteRepository.findOne({
        where: { id },
        relations: {
          items: true,
        },
      });

    if (!quote) {
      throw new NotFoundException(
        'Quote not found',
      );
    }

    if (quote.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft quotes can be sent',
      );
    }

    if (quote.items.length === 0) {
      throw new BadRequestException(
        'Quote must have at least one item',
      );
    }

    if (quote.total <= 0) {
      throw new BadRequestException(
        'Quote total must be greater than zero',
      );
    }

    quote.status = 'SENT';

    return this.quoteRepository.save(
      quote,
    );
  }

  async accept(id: string): Promise<Quote> {
    const quote =
      await this.quoteRepository.findOne({
        where: { id },
      });

    if (!quote) {
      throw new NotFoundException(
        'Quote not found',
      );
    }

    if (quote.status !== 'SENT') {
      throw new BadRequestException(
        'Only sent quotes can be accepted',
      );
    }

    quote.status = 'ACCEPTED';

    return this.quoteRepository.save(
      quote,
    );
  }

  async reject(id: string): Promise<Quote> {
    const quote =
      await this.quoteRepository.findOne({
        where: { id },
      });

    if (!quote) {
      throw new NotFoundException(
        'Quote not found',
      );
    }

    if (quote.status !== 'SENT') {
      throw new BadRequestException(
        'Only sent quotes can be rejected',
      );
    }

    quote.status = 'REJECTED';

    return this.quoteRepository.save(
      quote,
    );
  }

  async cancel(id: string): Promise<Quote> {
    const quote =
      await this.quoteRepository.findOne({
        where: { id },
      });

    if (!quote) {
      throw new NotFoundException(
        'Quote not found',
      );
    }

    if (
      quote.status !== 'DRAFT' &&
      quote.status !== 'SENT'
    ) {
      throw new BadRequestException(
        'Only draft or sent quotes can be cancelled',
      );
    }

    quote.status = 'CANCELLED';

    return this.quoteRepository.save(
      quote,
    );
  }

  async expire(id: string): Promise<Quote> {
    const quote =
      await this.quoteRepository.findOne({
        where: { id },
      });

    if (!quote) {
      throw new NotFoundException(
        'Quote not found',
      );
    }

    if (quote.status !== 'SENT') {
      throw new BadRequestException(
        'Only sent quotes can expire',
      );
    }

    quote.status = 'EXPIRED';

    return this.quoteRepository.save(
      quote,
    );
  }
}