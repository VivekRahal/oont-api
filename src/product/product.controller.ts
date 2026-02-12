import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { PaginationDto } from './dto/pagination.dto';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'List all available products with pagination' })
  findAll(@Query() pagination: PaginationDto) {
    return this.productService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full details for a single product' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }
}
