import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GrpcClientModule } from '@/grpc-client/grpc-client.module';

@Module({
  imports: [GrpcClientModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
