import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ description: 'User ID to create order for' })
  @IsNotEmpty()
  @IsString()
  userId: string;
}
