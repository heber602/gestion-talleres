import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DataModule } from './data/data.module';
import { PrismaModule } from './prisma/prisma.module';
import { WorkshopModule } from './workshop/workshop.module';

@Module({
  imports: [
    // Rate limiting: máx 20 req por minuto globalmente (auth tiene más restricciones abajo)
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,  // 1 minuto en ms
        limit: 20,
      },
    ]),
    PrismaModule,
    AuthModule,
    WorkshopModule,
    DataModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Aplica el guard de throttling a todos los endpoints automáticamente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
