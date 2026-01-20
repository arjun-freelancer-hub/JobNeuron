import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import axios from 'axios';
import { ApplicationJob } from './queue.service';

const AUTOMATION_WORKER_URL = process.env.AUTOMATION_WORKER_URL || 'http://localhost:3002';

@Processor('application')
export class ApplicationProcessor {
  @Process('process-application')
  async handleApplication(job: Job<ApplicationJob>) {
    const { applicationId, ...jobData } = job.data;

    try {
      // Send job to automation worker
      const response = await axios.post(
        `${AUTOMATION_WORKER_URL}/process`,
        jobData,
        {
          timeout: 300000, // 5 minutes timeout
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error processing application ${applicationId}:`, error);
      throw error;
    }
  }
}
