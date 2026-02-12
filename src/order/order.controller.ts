import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order from the user\'s cart' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Insufficient stock or empty cart',
  })
  createOrder(@Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(dto.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a specific order with its items' })
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order and restore stock' })
  cancelOrder(@Param('id') id: string) {
    return this.orderService.cancelOrder(id);
  }
}
