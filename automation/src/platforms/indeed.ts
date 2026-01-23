import { chromium, Browser, Page } from 'playwright';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const HEADLESS = process.env.HEADLESS !== 'false'; // Default to true unless explicitly set to 'false'
const BROWSER_TIMEOUT = parseInt(process.env.BROWSER_TIMEOUT || '30000', 10);
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);
const RETRY_DELAY = parseInt(process.env.RETRY_DELAY || '5000', 10);

export class IndeedAutomation {
  private browser: Browser | null = null;

  async applyToJob(job: any): Promise<any> {
    console.log('[Indeed] Received job data:', {
      applicationId: job.applicationId,
      jobId: job.jobId,
      platform: job.platform,
      jobUrl: job.jobUrl,
      url: job.url, // Check if old property exists
      hasJobUrl: !!job.jobUrl,
      hasUrl: !!job.url,
    });

    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    try {
      // Navigate to job page
      // Use jobUrl (new) or fallback to url (old) for backward compatibility
      const urlToUse = job.jobUrl || job.url;
      if (!urlToUse) {
        console.error('[Indeed] ❌ No URL found in job data. Available properties:', Object.keys(job));
        throw new Error('jobUrl is required but was not provided in job data. Available properties: ' + Object.keys(job).join(', '));
      }
      console.log('[Indeed] Navigating to URL:', urlToUse);
      await page.goto(urlToUse, { waitUntil: 'networkidle', timeout: BROWSER_TIMEOUT });

      // Wait for Apply button
      const applyButton = page.locator('button:has-text("Apply"), a:has-text("Apply")').first();
      await applyButton.waitFor({ timeout: BROWSER_TIMEOUT });
      await applyButton.click();

      // Wait for application form
      await page.waitForSelector('form, [data-testid="application-form"]', { timeout: BROWSER_TIMEOUT });

      // Get resume from R2
      const resumeUrl = await this.getResumeUrl(job.resumeId);

      // Fill form fields
      await this.fillApplicationForm(page, job, resumeUrl);

      // Submit application
      const submitButton = page.locator('button:has-text("Submit"), button[type="submit"]').first();
      await submitButton.click();

      // Wait for confirmation
      await page.waitForSelector('text=Application submitted, text=Thank you', { timeout: BROWSER_TIMEOUT });

      return {
        appliedAt: new Date().toISOString(),
        platform: 'INDEED',
      };
    } catch (error) {
      console.error('Indeed automation error:', error);
      throw error;
    } finally {
      await context.close();
    }
  }

  private async fillApplicationForm(page: Page, job: any, resumeUrl: string) {
    // Upload resume
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      // Download resume from R2 and upload
      // This is a placeholder - in production, you'd download from R2
      // await fileInput.setInputFiles(resumePath);
    }

    // Fill other required fields
    const inputs = await page.locator('input[type="text"], input[type="email"], textarea').all();
    for (const input of inputs) {
      const placeholder = await input.getAttribute('placeholder');
      if (placeholder?.toLowerCase().includes('phone')) {
        await input.fill(job.phone || '');
      } else if (placeholder?.toLowerCase().includes('email')) {
        await input.fill(job.email || '');
      }
    }

    // Add random delays to appear human
    await this.randomDelay(1000, 3000);
  }

  private async getResumeUrl(resumeId: string): Promise<string> {
    // Get resume download URL from API
    const response = await axios.get(`${API_URL}/resumes/${resumeId}/download`);
    return response.data.url;
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: HEADLESS,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
    }
    return this.browser;
  }

  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
