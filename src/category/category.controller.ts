import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { PaginationDto } from '../product/dto/pagination.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all product categories' })
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'List all products in a specific category' })
  findProducts(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.categoryService.findProductsByCategory(id, pagination);
  }
}
