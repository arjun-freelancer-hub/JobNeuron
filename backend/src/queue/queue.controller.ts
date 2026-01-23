import { Controller, Get, Logger } from '@nestjs/common';
import { QueueService } from './queue.service';

@Controller('queue')
export class QueueController {
  private readonly logger = new Logger(QueueController.name);

  constructor(private readonly queueService: QueueService) {}

  @Get('jobs/next')
  async getNextJob() {
    this.logger.debug('[Queue] Worker polling for next job...');
    
    try {
      // Add timeout to prevent hanging (increased to match service timeout)
      const jobPromise = this.queueService.getNextJob();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Queue operation timeout')), 4000)
      );
      
      const job = await Promise.race([jobPromise, timeoutPromise]) as any;
      
      if (!job) {
        this.logger.debug('[Queue] No jobs available in queue');
        return null;
      }

      this.logger.log(`[Queue] Returning job: applicationId=${job.applicationId}, jobId=${job.jobId}, platform=${job.platform}`);
      return job;
    } catch (error) {
      // Only log error if it's not a timeout (timeouts are expected when Redis is down)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage.includes('timeout')) {
        this.logger.error('[Queue] Error getting next job from queue:', error);
      }
      // Return null instead of throwing to prevent worker from timing out
      // The worker will continue polling
      return null;
    }
  }

  @Get('stats')
  async getQueueStats() {
    return this.queueService.getQueueStats();
  }

  @Get('health')
  async healthCheck() {
    try {
      // Quick check if Redis is accessible
      const stats = await this.queueService.getQueueStats();
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = process.env.REDIS_PORT || '6379';
      
      return { 
        status: 'ok', 
        redis: 'connected',
        redisConfig: `${redisHost}:${redisPort}`,
        queueStats: stats
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = process.env.REDIS_PORT || '6379';
      
      this.logger.error('[Queue] Health check failed:', error);
      return { 
        status: 'error', 
        redis: 'disconnected',
        redisConfig: `${redisHost}:${redisPort}`,
        message: `Redis is not accessible at ${redisHost}:${redisPort}`,
        error: errorMessage,
        troubleshooting: [
          '1. Check if Redis is running: docker ps | grep redis',
          '2. Start Redis: docker-compose up -d redis',
          '3. Verify Redis connection: redis-cli -h ' + redisHost + ' -p ' + redisPort + ' ping',
          '4. Check firewall/network if using remote Redis',
          '5. Update REDIS_HOST and REDIS_PORT in .env if needed'
        ]
      };
    }
  }
}
