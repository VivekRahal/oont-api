import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ description: 'Product ID to add to cart' })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Quantity to add', minimum: 1, default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
