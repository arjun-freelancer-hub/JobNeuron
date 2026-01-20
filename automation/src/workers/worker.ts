import axios from 'axios';
import { LinkedInAutomation } from '../platforms/linkedin';
import { IndeedAutomation } from '../platforms/indeed';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export class Worker {
  private linkedin: LinkedInAutomation;
  private indeed: IndeedAutomation;
  private consecutive404s: number = 0;
  private max404s: number = 10; // Stop after 10 consecutive 404s (50 seconds)
  private pollInterval: NodeJS.Timeout | null = null;
  private isStopped: boolean = false;

  constructor() {
    this.linkedin = new LinkedInAutomation();
    this.indeed = new IndeedAutomation();
  }

  async start() {
    console.log('[Worker] Automation worker started');
    console.log(`[Worker] API URL: ${API_URL}`);
    console.log(`[Worker] Will stop polling after ${this.max404s} consecutive 404s`);

    // Poll for jobs from the queue
    this.pollInterval = setInterval(async () => {
      if (this.isStopped) {
        this.stop();
        return;
      }
      await this.processNextJob();
    }, 5000); // Poll every 5 seconds
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('[Worker] Stopped polling (too many 404s or manually stopped)');
    }
  }

  private async processNextJob() {
    try {
      // Get next job from queue (this would come from Bull queue in production)
      // NOTE: This endpoint doesn't exist yet - it should be implemented in the backend
      // For now, this will return 404 which is expected
      const response = await axios.get(`${API_URL}/queue/jobs/next`, {
        timeout: 3000, // 3 second timeout
        validateStatus: (status) => status < 500, // Don't throw on 404
      });
      
      if (response.status === 404) {
        this.consecutive404s++;
        // Stop polling after too many consecutive 404s
        if (this.consecutive404s >= this.max404s) {
          console.log(`[Worker] Stopping - ${this.max404s} consecutive 404s. Endpoint doesn't exist yet.`);
          this.isStopped = true;
          this.stop();
          return;
        }
        // Silently return on 404 (expected when no jobs available)
        return;
      }

      // Reset counter on success
      this.consecutive404s = 0;
      
      if (response.data) {
        const job = response.data;
        await this.applyToJob(job);
      }
    } catch (error) {
      // Handle errors
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          console.warn(`[Worker] Cannot connect to backend at ${API_URL}. Is the backend running?`);
          console.warn(`[Worker] Stopping polling. Start the backend or stop the worker.`);
          this.isStopped = true;
          this.stop();
          return;
        }
        if (error.response?.status !== 404) {
          console.error('[Worker] Error processing job:', error.message);
        }
      } else {
        console.error('[Worker] Unexpected error:', error);
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
