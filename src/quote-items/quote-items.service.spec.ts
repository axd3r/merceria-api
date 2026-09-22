import { Test, TestingModule } from '@nestjs/testing';
import { QuoteItemsService } from './quote-items.service';

describe('QuoteItemsService', () => {
  let service: QuoteItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuoteItemsService],
    }).compile();

    service = module.get<QuoteItemsService>(QuoteItemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
