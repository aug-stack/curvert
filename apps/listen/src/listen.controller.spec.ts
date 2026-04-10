import { Test, TestingModule } from '@nestjs/testing';
import { ListenController } from './listen.controller';
import { ListenService } from './listen.service';

describe('ListenController', () => {
  let listenController: ListenController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ListenController],
      providers: [ListenService],
    }).compile();

    listenController = app.get<ListenController>(ListenController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(listenController.getHello()).toBe('Hello World!');
    });
  });
});
