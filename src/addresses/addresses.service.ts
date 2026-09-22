import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from './entities/address.entity';
import { Customer } from '../customers/entities/customer.entity';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,

    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
  ) {}

  async create(
    customerId: string,
    data: CreateAddressDto,
  ): Promise<Address> {
    const customer = await this.customersRepository.findOneBy({
      id: customerId,
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer with id ${customerId} not found`,
      );
    }

    const address = this.addressesRepository.create({
      ...data,
      customer,
    });

    return this.addressesRepository.save(address);
  }

  async findAllByCustomer(customerId: string): Promise<Address[]> {
    const customer = await this.customersRepository.findOneBy({
      id: customerId,
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer with id ${customerId} not found`,
      );
    }

    return this.addressesRepository.find({
      where: {
        customer: {
          id: customerId,
        },
      },
    });
  }

  async findOne(id: string): Promise<Address> {
    const address = await this.addressesRepository.findOne({
      where: { id },
      relations: {
        customer: true,
      },
    });

    if (!address) {
      throw new NotFoundException(
        `Address with id ${id} not found`,
      );
    }

    return address;
  }

  async update(
    id: string,
    data: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.findOne(id);

    Object.assign(address, data);

    return this.addressesRepository.save(address);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    await this.addressesRepository.delete(id);
  }
}