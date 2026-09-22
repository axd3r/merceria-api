import { Test, TestingModule } from '@nestjs/testing';
import { QuoteItemsController } from './quote-items.controller';
import { QuoteItemsService } from './quote-items.service';

describe('QuoteItemsController', () => {
  let controller: QuoteItemsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuoteItemsController],
      providers: [QuoteItemsService],
    }).compile();

    controller = module.get<QuoteItemsController>(QuoteItemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
