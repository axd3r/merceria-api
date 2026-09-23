import { lockOrder } from '../common/order-workflow';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, EntityManager, Repository } from 'typeorm';

import { OrderItem } from './entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { ProductUnit } from '../product-units/entities/product-unit.entity';

import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';

@Injectable()
export class OrderItemsService {
  constructor(
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(ProductUnit)
    private readonly productUnitRepository: Repository<ProductUnit>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createOrderItemDto: CreateOrderItemDto): Promise<OrderItem> {
    return this.dataSource.transaction(async (manager) => {
      const order = await lockOrder(manager, createOrderItemDto.orderId);
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== 'PENDING') {
        throw new BadRequestException('Only pending orders can be modified');
      }

      if (order.agreedPrice != null) {
        throw new BadRequestException(
          'Orders with an agreed price cannot receive items',
        );
      }

      let productUnit: ProductUnit | null = null;

      if (createOrderItemDto.itemType === 'PRODUCT') {
        if (!createOrderItemDto.productUnitId) {
          throw new BadRequestException(
            'Product unit is required for product items',
          );
        }

        productUnit = await manager.findOne(ProductUnit, {
          where: {
            id: createOrderItemDto.productUnitId,
          },
          relations: {
            product: true,
            unit: true,
          },
        });

        if (!productUnit) {
          throw new NotFoundException('Product unit not found');
        }

        if (!productUnit.isSaleUnit) {
          throw new BadRequestException(
            'Product unit is not configured as a sale unit',
          );
        }
      }

      if (
        createOrderItemDto.itemType === 'CUSTOM' &&
        createOrderItemDto.productUnitId
      ) {
        throw new BadRequestException(
          'Custom items cannot have a product unit',
        );
      }

      const quantity = Number(createOrderItemDto.quantity);

      const unitPrice = Number(createOrderItemDto.unitPrice);

      const subtotal = quantity * unitPrice;

      const orderItem = manager.create(OrderItem, {
        order,
        productUnit,
        itemType: createOrderItemDto.itemType,
        description: createOrderItemDto.description,
        quantity,
        unitPrice,
        subtotal,
      });

      const savedItem = await manager.save(orderItem);

      await this.recalculate(manager, order.id);

      return manager.findOneOrFail(OrderItem, {
        where: {
          id: savedItem.id,
        },
        relations: {
          order: true,
          productUnit: {
            product: true,
            unit: true,
          },
        },
      });
    });
  }

  async findAll(): Promise<OrderItem[]> {
    return this.orderItemRepository.find({
      relations: {
        order: true,
        productUnit: {
          product: true,
          unit: true,
        },
      },
    });
  }

  async findOne(id: string): Promise<OrderItem> {
    const orderItem = await this.orderItemRepository.findOne({
      where: {
        id,
      },
      relations: {
        order: true,
        productUnit: {
          product: true,
          unit: true,
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    return orderItem;
  }

  async update(
    id: string,
    updateOrderItemDto: UpdateOrderItemDto,
  ): Promise<OrderItem> {
    return this.dataSource.transaction(async (manager) => {
      const orderItem = await manager.findOne(OrderItem, {
        where: {
          id,
        },
        relations: {
          order: true,
          productUnit: {
            product: true,
            unit: true,
          },
        },
      });

      if (!orderItem) {
        throw new NotFoundException('Order item not found');
      }

      orderItem.order = await lockOrder(manager, orderItem.order.id);
      if (orderItem.order.status !== 'PENDING') {
        throw new BadRequestException('Only pending orders can be modified');
      }

      if (updateOrderItemDto.description !== undefined) {
        orderItem.description = updateOrderItemDto.description;
      }

      if (updateOrderItemDto.quantity !== undefined) {
        orderItem.quantity = Number(updateOrderItemDto.quantity);
      }

      if (updateOrderItemDto.unitPrice !== undefined) {
        orderItem.unitPrice = Number(updateOrderItemDto.unitPrice);
      }

      orderItem.subtotal =
        Number(orderItem.quantity) * Number(orderItem.unitPrice);

      const savedItem = await manager.save(orderItem);

      await this.recalculate(manager, orderItem.order.id);

      return manager.findOneOrFail(OrderItem, {
        where: {
          id: savedItem.id,
        },
        relations: {
          order: true,
          productUnit: {
            product: true,
            unit: true,
          },
        },
      });
    });
  }

  async remove(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const orderItem = await manager.findOne(OrderItem, {
        where: {
          id,
        },
        relations: {
          order: true,
        },
      });

      if (!orderItem) {
        throw new NotFoundException('Order item not found');
      }

      orderItem.order = await lockOrder(manager, orderItem.order.id);
      if (orderItem.order.status !== 'PENDING') {
        throw new BadRequestException('Only pending orders can be modified');
      }

      const orderId = orderItem.order.id;

      await manager.remove(orderItem);

      await this.recalculate(manager, orderId);
    });
  }

  async recalculate(manager: EntityManager, orderId: string): Promise<Order> {
    const order = await manager.findOne(Order, {
      where: {
        id: orderId,
      },
      relations: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const subtotal = order.items.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0,
    );

    const discount = Number(order.discount);

    if (discount > subtotal) {
      throw new BadRequestException('Discount cannot be greater than subtotal');
    }

    order.subtotal = subtotal;
    order.total = subtotal - discount;

    return manager.save(order);
  }
}
