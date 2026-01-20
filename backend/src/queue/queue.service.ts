import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

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
  constructor(
    @InjectQueue('application') private applicationQueue: Queue,
  ) {}

  async addApplicationJob(jobData: ApplicationJob) {
    return this.applicationQueue.add('process-application', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async getQueueStats() {
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
  }
}
