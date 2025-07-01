import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'GRPC_AUTH_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            url: configService.getOrThrow('GRPC_GATEWAY_URL'),
            package: 'auth',
            protoPath: path.join(
              configService.getOrThrow('MONOREPO_ROOT'),
              '_proto',
              'auth.proto',
            ),
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class GrpcClientModule {}
