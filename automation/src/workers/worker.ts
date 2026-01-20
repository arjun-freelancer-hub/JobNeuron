import axios from 'axios';
import { LinkedInAutomation } from '../platforms/linkedin';
import { IndeedAutomation } from '../platforms/indeed';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export class Worker {
  private linkedin: LinkedInAutomation;
  private indeed: IndeedAutomation;

  constructor() {
    this.linkedin = new LinkedInAutomation();
    this.indeed = new IndeedAutomation();
  }

  async start() {
    console.log('Automation worker started');

    // Poll for jobs from the queue
    setInterval(async () => {
      await this.processNextJob();
    }, 5000); // Poll every 5 seconds
  }

  private async processNextJob() {
    try {
      // Get next job from queue (this would come from Bull queue in production)
      const response = await axios.get(`${API_URL}/queue/jobs/next`);
      
      if (response.data) {
        const job = response.data;
        await this.applyToJob(job);
      }
    } catch (error) {
      // No jobs available or error
      if (axios.isAxiosError(error) && error.response?.status !== 404) {
        console.error('Error processing job:', error);
      }
    }
  }

  private async applyToJob(job: any) {
    try {
      console.log(`Processing job: ${job.jobId} on platform: ${job.platform}`);

      let result;
      switch (job.platform) {
        case 'LINKEDIN':
          result = await this.linkedin.applyToJob(job);
          break;
        case 'INDEED':
          result = await this.indeed.applyToJob(job);
          break;
        default:
          throw new Error(`Unsupported platform: ${job.platform}`);
      }

      // Report success
      await axios.post(`${API_URL}/applications/${job.applicationId}/complete`, {
        status: 'SUCCESS',
        ...result,
      });
    } catch (error) {
      console.error(`Error applying to job ${job.jobId}:`, error);
      
      // Report failure
      try {
        await axios.post(`${API_URL}/applications/${job.applicationId}/complete`, {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (reportError) {
        console.error('Error reporting failure:', reportError);
      }
    }
  }
}
