import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

export interface ApplicationJob {
  applicationId: string;
  userId: string;
  jobId: string;
  resumeId: string;
  platform: string;
  jobUrl: string;
  email?: string;
  phone?: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private lastRedisWarning: number | null = null;

  constructor(
    @InjectQueue('application') private applicationQueue: Queue,
  ) {}

  async addApplicationJob(jobData: ApplicationJob) {
    try {
      this.logger.log(`[Queue] Adding job to queue: applicationId=${jobData.applicationId}, platform=${jobData.platform}`);
      const job = await this.applicationQueue.add('process-application', jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
      this.logger.log(`[Queue] ✅ Job added to queue: jobId=${job.id}`);
      return job;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`[Queue] ⚠️ Error adding job to queue (will be queued when Redis is available): ${errorMessage}`);
      // Re-throw to let caller handle it, but the job will be queued by ioredis when Redis comes back
      throw error;
    }
  }

  async getQueueStats() {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.applicationQueue.getWaitingCount(),
        this.applicationQueue.getActiveCount(),
        this.applicationQueue.getCompletedCount(),
        this.applicationQueue.getFailedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`[Queue] Error getting queue stats: ${errorMessage}`);
      // Return zero stats if Redis is unavailable
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      };
    }
  }

  async getNextJob() {
    let waitingJobs;
    try {
      // Get waiting jobs (oldest first) - limit to 1 job
      this.logger.debug('[Queue] Fetching waiting jobs from Redis...');
      
      // Add timeout to Redis operation (reduced to 3 seconds for faster failure)
      const redisPromise = this.applicationQueue.getWaiting(0, 1);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis operation timeout - Redis may not be running')), 3000)
      );
      
      waitingJobs = await Promise.race([redisPromise, timeoutPromise]) as any;
      this.logger.debug(`[Queue] Found ${waitingJobs.length} waiting job(s)`);
      
      if (waitingJobs.length === 0) {
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a Redis connection error
      if (errorMessage.includes('Stream isn\'t writeable') || 
          errorMessage.includes('enableOfflineQueue') ||
          errorMessage.includes('timeout') || 
          errorMessage.includes('Redis') ||
          errorMessage.includes('max retries') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ENOTFOUND')) {
        // Only log warning once per minute to reduce log spam
        const now = Date.now();
        if (!this.lastRedisWarning || now - this.lastRedisWarning > 60000) {
          this.logger.warn(`[Queue] ⚠️ Redis connection unavailable: ${errorMessage}`);
          this.logger.warn(`[Queue] ⚠️ Redis config: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);
          this.logger.warn('[Queue] ⚠️ Queue operations will be queued until Redis is available');
          this.logger.warn('[Queue] 💡 Tip: Ensure Redis is running or update REDIS_HOST/REDIS_PORT in .env');
          this.lastRedisWarning = now;
        }
        // Return null instead of throwing - allows the worker to continue polling
        return null;
      }
      
      // For other errors, log and return null
      this.logger.error(`[Queue] Error fetching jobs from Redis: ${errorMessage}`);
      return null;
    }

    const nextJob = waitingJobs[0];
    
    // Move job to active state to prevent duplicate processing
    // Note: Bull doesn't have a direct "take" method, so we'll remove it
    // The worker will handle completion reporting separately
    try {
      // Remove the job from waiting queue (worker will process it)
      // This prevents the ApplicationProcessor from also picking it up
      await nextJob.remove();
      this.logger.log(`[Queue] Job ${nextJob.id} removed from queue for worker processing`);
    } catch (error) {
      this.logger.warn(`[Queue] Could not remove job ${nextJob.id}:`, error);
      // Continue anyway - worst case it gets processed twice
    }
    
    this.logger.log(`[Queue] Returning job to worker: applicationId=${nextJob.data.applicationId}, bullJobId=${nextJob.id}`);
    
    // Return job data in format expected by worker
    return {
      applicationId: nextJob.data.applicationId,
      userId: nextJob.data.userId,
      jobId: nextJob.data.jobId,
      resumeId: nextJob.data.resumeId,
      platform: nextJob.data.platform,
      jobUrl: nextJob.data.jobUrl,
      email: nextJob.data.email,
      phone: nextJob.data.phone,
      bullJobId: nextJob.id, // Store Bull job ID for reference
    };
  }

  async removeJob(jobId: string) {
    const job = await this.applicationQueue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }
}
