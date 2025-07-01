import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as path from 'path';
import validationOptions from '@/utils/validation.options';

async function bootstrap() {
  console.log('Starting Auth Service...');
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        url: process.env.GRPC_GATEWAY_URL,
        package: 'auth',
        protoPath: path.join(
          process.env.MONOREPO_ROOT ?? '',
          '_proto',
          'auth.proto',
        ),
      },
    },
  );

  app.useGlobalPipes(new ValidationPipe(validationOptions));

  await app.listen();
  console.log('Auth Service is ready!');
  console.log(`Auth Service started at ${process.env.GRPC_GATEWAY_URL}`);
}
void bootstrap();
