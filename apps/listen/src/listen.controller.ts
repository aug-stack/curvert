import { Controller, Get } from '@nestjs/common';

@Controller()
export class ListenController {
  constructor() {}

  @Get()
  health(): string {
    return 'ok'
  }
}
