import { lockProduction } from '../common/order-workflow';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ProductionMaterial } from './entities/production-material.entity';
import { Production } from '../productions/entities/production.entity';
import { ProductUnit } from '../product-units/entities/product-unit.entity';
import { CreateProductionMaterialDto } from './dto/create-production-material.dto';
import { UpdateProductionMaterialDto } from './dto/update-production-material.dto';

@Injectable()
export class ProductionMaterialsService {
  constructor(
    @InjectRepository(ProductionMaterial)
    private readonly materialRepository: Repository<ProductionMaterial>,
    private readonly dataSource: DataSource,
  ) {}

  private async editableProduction(manager: EntityManager, id: string) {
    const production = await lockProduction(manager, id);
    if (!production) throw new NotFoundException('Production not found');
    if (
      ['CANCELLED', 'DELIVERED'].includes(production.order.status) ||
      !['PENDING', 'IN_PROGRESS'].includes(production.status)
    ) {
      throw new BadRequestException(
        'Materials can only be changed in pending or in-progress productions',
      );
    }
    return production;
  }

  private async productUnit(manager: EntityManager, id?: string | null) {
    if (!id) return null;
    const unit = await manager.findOne(ProductUnit, { where: { id } });
    if (!unit) throw new NotFoundException('Product unit not found');
    return unit;
  }

  async create(dto: CreateProductionMaterialDto): Promise<ProductionMaterial> {
    return this.dataSource.transaction(async (manager) => {
      const production = await this.editableProduction(
        manager,
        dto.productionId,
      );
      const productUnit = await this.productUnit(manager, dto.productUnitId);
      return manager.save(
        ProductionMaterial,
        manager.create(ProductionMaterial, {
          production,
          productUnit,
          description: dto.description.trim(),
          quantity: dto.quantity,
          unitCost: dto.unitCost,
          subtotal: Number((dto.quantity * dto.unitCost).toFixed(2)),
        }),
      );
    });
  }

  findAll(): Promise<ProductionMaterial[]> {
    return this.materialRepository.find({
      relations: {
        production: true,
        productUnit: { product: true, unit: true },
      },
    });
  }

  async findOne(id: string): Promise<ProductionMaterial> {
    const material = await this.materialRepository.findOne({
      where: { id },
      relations: {
        production: true,
        productUnit: { product: true, unit: true },
      },
    });
    if (!material) throw new NotFoundException('Production material not found');
    return material;
  }

  private async editableMaterial(manager: EntityManager, id: string) {
    const linked = await manager.findOne(ProductionMaterial, {
      where: { id },
      relations: { production: true },
    });
    if (!linked) throw new NotFoundException('Production material not found');
    await this.editableProduction(manager, linked.production.id);
    const material = await manager.findOne(ProductionMaterial, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!material) throw new NotFoundException('Production material not found');
    return material;
  }

  async update(
    id: string,
    dto: UpdateProductionMaterialDto,
  ): Promise<ProductionMaterial> {
    return this.dataSource.transaction(async (manager) => {
      const material = await this.editableMaterial(manager, id);
      if (dto.productUnitId !== undefined)
        material.productUnit = await this.productUnit(
          manager,
          dto.productUnitId,
        );
      if (dto.description !== undefined)
        material.description = dto.description.trim();
      if (dto.quantity !== undefined) material.quantity = dto.quantity;
      if (dto.unitCost !== undefined) material.unitCost = dto.unitCost;
      material.subtotal = Number(
        (Number(material.quantity) * Number(material.unitCost)).toFixed(2),
      );
      return manager.save(ProductionMaterial, material);
    });
  }

  async remove(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const material = await this.editableMaterial(manager, id);
      await manager.remove(ProductionMaterial, material);
    });
  }
}
