import { Test, TestingModule } from '@nestjs/testing';
import { ProductUnitsService } from './product-units.service';

describe('ProductUnitsService', () => {
  let service: ProductUnitsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductUnitsService],
    }).compile();

    service = module.get<ProductUnitsService>(ProductUnitsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
