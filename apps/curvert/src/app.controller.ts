import { Body, Controller, Post, NotFoundException, ServiceUnavailableException, InternalServerErrorException } from '@nestjs/common';
import { CurrencyNotFoundException, RateUnavailableException } from './app.exceptions';
import { AppDto } from './app.dto';
import { AppService } from './app.service';


@Controller()
export class AppController {
  constructor(private readonly conversionService: AppService) {}

  @Post('convert')
  async convert(@Body() dto: AppDto) {
    const { from, to, amount } = dto;

    try {
      return await this.conversionService.getExchangeRate(from, to, amount);
    } catch (err) {
      if (err instanceof CurrencyNotFoundException) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof RateUnavailableException) {
        throw new ServiceUnavailableException(err.message);
      }
      throw new InternalServerErrorException('Conversion failed');
    }
  }
}