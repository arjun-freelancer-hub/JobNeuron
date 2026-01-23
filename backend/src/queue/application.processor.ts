import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { ApplicationJob } from './queue.service';

/**
 * ApplicationProcessor is disabled because the automation worker
 * polls the backend for jobs via /queue/jobs/next endpoint.
 * 
 * Jobs are queued and remain in the queue until the automation worker
 * polls and retrieves them. This processor should not process jobs
 * to avoid conflicts with the polling worker.
 */
@Processor('application')
export class ApplicationProcessor {
  @Process('process-application')
  async handleApplication(job: Job<ApplicationJob>) {
    const { applicationId } = job.data;

    // Do not process jobs here - let the automation worker poll for them
    // The automation worker will retrieve jobs via /queue/jobs/next endpoint
    // and process them directly using browser automation
    
    console.log(`[ApplicationProcessor] Job ${applicationId} queued - waiting for automation worker to poll`);
    
    // Return without processing - job stays in queue for worker to pick up
    return { message: 'Job queued for automation worker', applicationId };
  }
}
