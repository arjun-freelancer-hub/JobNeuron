import axios from 'axios';
import { LinkedInAutomation } from '../platforms/linkedin';
import { IndeedAutomation } from '../platforms/indeed';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const WORKER_POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL || '5000', 10);
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || '1', 10);
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);
const RETRY_DELAY = parseInt(process.env.RETRY_DELAY || '5000', 10);

export class Worker {
  private linkedin: LinkedInAutomation;
  private indeed: IndeedAutomation;
  private consecutive404s: number = 0;
  private max404s: number = 10; // Stop after 10 consecutive 404s (50 seconds) - only for initial connection check
  private consecutiveTimeouts: number = 0;
  private maxTimeouts: number = 10; // Stop after 10 consecutive timeouts
  private pollInterval: NodeJS.Timeout | null = null;
  private isStopped: boolean = false;
  private endpointExists: boolean = false;
  private processedJobs: number = 0;

  constructor() {
    this.linkedin = new LinkedInAutomation();
    this.indeed = new IndeedAutomation();
  }

  async start() {
    console.log('[Worker] ========================================');
    console.log('[Worker] Automation worker started');
    console.log(`[Worker] API URL: ${API_URL}`);
    console.log(`[Worker] Polling interval: ${WORKER_POLL_INTERVAL}ms (${WORKER_POLL_INTERVAL / 1000}s)`);
    console.log(`[Worker] Max concurrent jobs: ${MAX_CONCURRENT_JOBS}`);
    console.log(`[Worker] Log level: ${LOG_LEVEL}`);
    console.log('[Worker] ========================================');

    // Check backend connection at startup
    await this.checkBackendConnection();

    // Poll for jobs from the queue
    this.pollInterval = setInterval(async () => {
      if (this.isStopped) {
        this.stop();
        return;
      }
      await this.processNextJob();
    }, WORKER_POLL_INTERVAL);
  }

  private async checkBackendConnection() {
    console.log(`[Worker] Checking backend connection at ${API_URL}...`);
    try {
      const response = await axios.get(`${API_URL}/queue/jobs/next`, {
        timeout: 5000,
        validateStatus: (status) => status < 500,
      });
      
      // If we get any response (even 404), the backend is reachable
      console.log(`[Worker] ✓ Backend is reachable at ${API_URL}`);
      this.endpointExists = true;
      this.consecutive404s = 0;
      
      if (response.status === 404) {
        console.log(`[Worker] ⚠️  Endpoint /queue/jobs/next returned 404`);
        console.log(`[Worker] ⚠️  This might be normal if the endpoint doesn't exist yet`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          console.error(`[Worker] ❌ Cannot connect to backend at ${API_URL}`);
          console.error(`[Worker] ❌ Please ensure the backend is running on port 3002`);
          console.error(`[Worker] ❌ Start the backend with: cd backend && npm run start:dev`);
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          console.error(`[Worker] ❌ Backend connection timeout at ${API_URL}`);
          console.error(`[Worker] ❌ The backend might be slow to respond or not running`);
        } else {
          console.error(`[Worker] ❌ Backend connection error: ${error.message}`);
        }
      } else {
        console.error(`[Worker] ❌ Unexpected error checking backend:`, error);
      }
      console.log(`[Worker] ⚠️  Worker will continue polling, but may fail until backend is available`);
    }
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('[Worker] ========================================');
      console.log(`[Worker] Stopped polling`);
      console.log(`[Worker] Total jobs processed: ${this.processedJobs}`);
      console.log('[Worker] ========================================');
    }
  }

  private async processNextJob() {
    try {
      const response = await axios.get(`${API_URL}/queue/jobs/next`, {
        timeout: 3000, // 3 second timeout
        validateStatus: (status) => status < 500, // Don't throw on 404
      });
      
      if (response.status === 404) {
        // Endpoint doesn't exist - check if we've confirmed it exists before
        if (!this.endpointExists) {
          this.consecutive404s++;
          if (this.consecutive404s === 1) {
            console.warn(`[Worker] ⚠️  Endpoint /queue/jobs/next returned 404`);
            console.warn(`[Worker] ⚠️  Make sure the backend is running and the endpoint exists`);
          }
          // Stop polling after too many consecutive 404s (endpoint doesn't exist)
          if (this.consecutive404s >= this.max404s) {
            console.error(`[Worker] ❌ Stopping - ${this.max404s} consecutive 404s. Endpoint doesn't exist.`);
            console.error(`[Worker] ❌ Please check that the backend is running at ${API_URL}`);
            this.isStopped = true;
            this.stop();
            return;
          }
        } else {
          // Endpoint exists but no jobs available - this is normal
          if (this.consecutive404s === 0) {
            console.log('[Worker] ✓ Polling... (no jobs in queue)');
          }
        }
        return;
      }

      // Endpoint exists and returned successfully
      if (!this.endpointExists) {
        this.endpointExists = true;
        console.log('[Worker] ✓ Connected to backend successfully');
        console.log('[Worker] ✓ Ready to process jobs');
      }

      // Reset counters on success
      this.consecutive404s = 0;
      this.consecutiveTimeouts = 0;
      
      if (response.data && response.data.applicationId) {
        const job = response.data;
        console.log(`[Worker] 📥 Received job: applicationId=${job.applicationId}`);
        await this.applyToJob(job);
      } else {
        // No job available (null response)
        // This is normal, just continue polling
      }
    } catch (error) {
      // Handle errors
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          console.error(`[Worker] ❌ Cannot connect to backend at ${API_URL}`);
          console.error(`[Worker] ❌ Is the backend running?`);
          console.error(`[Worker] ❌ Stopping polling. Start the backend or stop the worker.`);
          this.isStopped = true;
          this.stop();
          return;
        }
        
        // Handle timeout errors
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          this.consecutiveTimeouts++;
          if (this.consecutiveTimeouts === 1) {
            console.error(`[Worker] ❌ Request timeout - backend not responding at ${API_URL}`);
            console.error(`[Worker] ❌ Check if backend is running on the correct port`);
            console.error(`[Worker] ❌ Backend default port is 3001, but worker is trying ${API_URL}`);
          }
          
          // Stop after too many consecutive timeouts
          if (this.consecutiveTimeouts >= this.maxTimeouts) {
            console.error(`[Worker] ❌ Stopping - ${this.maxTimeouts} consecutive timeouts`);
            console.error(`[Worker] ❌ Backend is not responding. Please check:`);
            console.error(`[Worker] ❌   1. Is the backend running?`);
            console.error(`[Worker] ❌   2. Is it running on port 3002? (check backend logs)`);
            console.error(`[Worker] ❌   3. Check your backend .env file - PORT should be 3002`);
            console.error(`[Worker] ❌   4. Verify API_URL in automation/.env matches backend port`);
            this.isStopped = true;
            this.stop();
            return;
          }
          return;
        }
        
        // Reset timeout counter on other errors
        this.consecutiveTimeouts = 0;
        
        if (error.response?.status !== 404) {
          console.error(`[Worker] ❌ Error polling for jobs: ${error.message}`);
          if (error.response?.data) {
            console.error(`[Worker] ❌ Response:`, error.response.data);
          }
        }
      } else {
        console.error('[Worker] ❌ Unexpected error:', error);
      }
    }
  }

  private async applyToJob(job: any) {
    const startTime = Date.now();
    console.log('[Worker] ========================================');
    console.log(`[Worker] 🚀 Processing job application`);
    console.log(`[Worker]   Application ID: ${job.applicationId}`);
    console.log(`[Worker]   Job ID: ${job.jobId}`);
    console.log(`[Worker]   Platform: ${job.platform}`);
    console.log(`[Worker]   Job URL: ${job.jobUrl}`);
    console.log(`[Worker]   Resume ID: ${job.resumeId}`);
    console.log(`[Worker]   Max retries: ${MAX_RETRIES}`);
    console.log('[Worker] ========================================');

    let lastError: Error | null = null;
    
    // Retry logic
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`[Worker] 🔄 Retry attempt ${attempt}/${MAX_RETRIES} after ${RETRY_DELAY}ms delay...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }

        let result;
        switch (job.platform.toUpperCase()) {
          case 'LINKEDIN':
            console.log(`[Worker] 🔵 Applying via LinkedIn... (attempt ${attempt}/${MAX_RETRIES})`);
            result = await this.linkedin.applyToJob(job);
            break;
          case 'INDEED':
            console.log(`[Worker] 🔵 Applying via Indeed... (attempt ${attempt}/${MAX_RETRIES})`);
            result = await this.indeed.applyToJob(job);
            break;
          default:
            throw new Error(`Unsupported platform: ${job.platform}`);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[Worker] ✅ Successfully applied to job in ${duration}s`);
        console.log(`[Worker] 📤 Reporting success to backend...`);

        // Report success
        await axios.post(`${API_URL}/applications/${job.applicationId}/complete`, {
          status: 'SUCCESS',
          ...result,
        });

        console.log(`[Worker] ✅ Success reported to backend`);
        this.processedJobs++;
        console.log('[Worker] ========================================');
        return; // Success - exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMessage = lastError.message;
        
        if (attempt < MAX_RETRIES) {
          console.warn(`[Worker] ⚠️  Attempt ${attempt}/${MAX_RETRIES} failed: ${errorMessage}`);
          console.warn(`[Worker] ⚠️  Will retry in ${RETRY_DELAY}ms...`);
        } else {
          // Last attempt failed
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          console.error(`[Worker] ❌ Failed to apply to job after ${MAX_RETRIES} attempts (${duration}s)`);
          console.error(`[Worker] ❌ Final error: ${errorMessage}`);
          
          if (lastError.stack) {
            console.error(`[Worker] ❌ Stack trace:`, lastError.stack);
          }
        }
      }
    }

    // All retries exhausted - report failure
    const errorMessage = lastError?.message || 'Unknown error';
    try {
      console.log(`[Worker] 📤 Reporting failure to backend...`);
      await axios.post(`${API_URL}/applications/${job.applicationId}/complete`, {
        status: 'FAILED',
        errorMessage: errorMessage,
      });
      console.log(`[Worker] ✅ Failure reported to backend`);
    } catch (reportError) {
      console.error('[Worker] ❌ Error reporting failure:', reportError);
    }
    console.log('[Worker] ========================================');
  }
}
