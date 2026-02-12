import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('OoNt Grocery API')
    .setDescription(
      'Grocery Inventory & Order Processing API for OoNt delivery service',
    )
    .setVersion('1.0')
    .addTag('Products', 'Public product browsing endpoints')
    .addTag('Categories', 'Product category endpoints')
    .addTag('Cart', 'Shopping cart management')
    .addTag('Orders', 'Order processing and management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
