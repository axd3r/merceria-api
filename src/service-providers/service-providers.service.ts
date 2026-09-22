import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { ServiceProvider } from './entities/service-provider.entity';

import { CreateServiceProviderDto } from './dto/create-service-provider.dto';

import { UpdateServiceProviderDto } from './dto/update-service-provider.dto';

@Injectable()
export class ServiceProvidersService {
  constructor(
    @InjectRepository(ServiceProvider)
    private readonly serviceProviderRepository: Repository<ServiceProvider>,
  ) {}

  async create(
    createServiceProviderDto: CreateServiceProviderDto,
  ): Promise<ServiceProvider> {
    const serviceProvider =
      this.serviceProviderRepository.create({
        name: createServiceProviderDto.name,
        type: createServiceProviderDto.type,
        phone:
          createServiceProviderDto.phone ?? null,
        notes:
          createServiceProviderDto.notes ?? null,
      });

    return this.serviceProviderRepository.save(
      serviceProvider,
    );
  }

  async findAll(): Promise<ServiceProvider[]> {
    return this.serviceProviderRepository.find();
  }

  async findOne(
    id: string,
  ): Promise<ServiceProvider> {
    const serviceProvider =
      await this.serviceProviderRepository.findOne({
        where: { id },
      });

    if (!serviceProvider) {
      throw new NotFoundException(
        'Service provider not found',
      );
    }

    return serviceProvider;
  }

  async update(
    id: string,
    updateServiceProviderDto: UpdateServiceProviderDto,
  ): Promise<ServiceProvider> {
    const serviceProvider =
      await this.findOne(id);

    Object.assign(
      serviceProvider,
      updateServiceProviderDto,
    );

    return this.serviceProviderRepository.save(
      serviceProvider,
    );
  }

  async remove(
    id: string,
  ): Promise<void> {
    const serviceProvider =
      await this.findOne(id);

    await this.serviceProviderRepository.remove(
      serviceProvider,
    );
  }
}