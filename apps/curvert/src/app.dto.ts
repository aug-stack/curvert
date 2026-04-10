import { IsNumberString } from 'class-validator';
import { Type } from 'class-transformer';

export class AppDto {
  @IsNumberString()
  from: number;

  @IsNumberString()
  to: number;

  @IsNumberString()
  amount: string;
}