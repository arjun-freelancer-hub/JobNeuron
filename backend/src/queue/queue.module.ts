import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { ApplicationProcessor } from './application.processor';
import { QueueController } from './queue.controller';

@Module({
  imports: [
    // Use forRootAsync to ensure ConfigService is available
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD') || undefined;
        
        // Log Redis configuration for debugging
        console.log(`[QueueModule] Redis configuration: ${redisHost}:${redisPort}`);
        
        return {
          redis: {
            host: redisHost,
            port: redisPort,
            password: redisPassword as string | undefined,
            connectTimeout: 10000, // 10 seconds connection timeout
            lazyConnect: false, // Connect immediately
            // Note: maxRetriesPerRequest and enableReadyCheck are not allowed by Bull
            // Bull manages its own Redis clients and doesn't support these options
            retryStrategy: (times: number) => {
              // Retry with exponential backoff, but stop after 5 attempts
              if (times > 5) {
                return null; // Stop retrying
              }
              const delay = Math.min(times * 50, 2000);
              return delay;
            },
            enableOfflineQueue: true, // Queue commands when offline (prevents immediate errors)
            showFriendlyErrorStack: true, // Better error messages
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'application',
    }),
  ],
  controllers: [QueueController],
  providers: [QueueService, ApplicationProcessor],
  exports: [QueueService],
})
export class QueueModule {}
