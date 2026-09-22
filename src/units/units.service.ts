import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Unit } from './entities/unit.entity';

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitsRepository: Repository<Unit>,
  ) {}

  async create(data: CreateUnitDto): Promise<Unit> {
    const unit = this.unitsRepository.create(data);

    return this.unitsRepository.save(unit);
  }

  async findAll(): Promise<Unit[]> {
    return this.unitsRepository.find();
  }

  async findOne(id: string): Promise<Unit> {
    const unit = await this.unitsRepository.findOneBy({
      id,
    });

    if (!unit) {
      throw new NotFoundException(
        `Unit with id ${id} not found`,
      );
    }

    return unit;
  }

  async update(
    id: string,
    data: UpdateUnitDto,
  ): Promise<Unit> {
    const unit = await this.findOne(id);

    Object.assign(unit, data);

    return this.unitsRepository.save(unit);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    await this.unitsRepository.delete(id);
  }
}