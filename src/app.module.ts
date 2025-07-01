import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv, configuration } from '@/config';
import { GrpcClientModule } from './grpc-client/grpc-client.module';
import { AuthModule } from './auth/auth.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv as (
        config: Record<string, unknown>,
      ) => Record<string, unknown>,
      cache: true,
    }),
    GrpcClientModule,
    AuthModule,
    MikroOrmModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
