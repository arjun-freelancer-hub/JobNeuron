import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobPlatform } from '../schemas/job.schema';
import { LinkedInScraper } from './scrapers/linkedin.scraper';
import { IndeedScraper } from './scrapers/indeed.scraper';

@Injectable()
export class JobDiscoveryService implements OnModuleDestroy {
  private readonly logger = new Logger(JobDiscoveryService.name);

  constructor(
    private jobsService: JobsService,
    private linkedInScraper: LinkedInScraper,
    private indeedScraper: IndeedScraper,
  ) {}

  async discoverJobs(filters: {
    platform: JobPlatform;
    title?: string;
    location?: string;
    limit?: number;
  }): Promise<{ count: number; message: string }> {
    const { platform, title = '', location = '', limit = 20 } = filters;

    this.logger.log(
      `Starting job discovery: platform=${platform}, title=${title}, location=${location}, limit=${limit}`,
    );

    let jobsFound = 0;

    try {
      switch (platform) {
        case JobPlatform.LINKEDIN:
          jobsFound = await this.scrapeLinkedIn({ title, location, limit });
          break;
        case JobPlatform.INDEED:
          jobsFound = await this.scrapeIndeed({ title, location, limit });
          break;
        case JobPlatform.WELLFOUND:
          this.logger.warn('Wellfound scraper not yet implemented');
          return { count: 0, message: 'Wellfound scraper not yet implemented' };
        case JobPlatform.COMPANY:
          this.logger.warn('Company page scraper not yet implemented');
          return { count: 0, message: 'Company page scraper not yet implemented' };
        default:
          this.logger.error(`Unknown platform: ${platform}`);
          return { count: 0, message: `Unknown platform: ${platform}` };
      }

      this.logger.log(`Job discovery completed: ${jobsFound} jobs found and saved`);
      return {
        count: jobsFound,
        message: `Successfully discovered and saved ${jobsFound} jobs from ${platform}`,
      };
    } catch (error) {
      this.logger.error('Error during job discovery:', error);
      throw error;
    }
  }

  private async scrapeLinkedIn(filters: {
    title: string;
    location: string;
    limit: number;
  }): Promise<number> {
    try {
      const scrapedJobs = await this.linkedInScraper.scrapeJobs(filters);
      let savedCount = 0;

      for (const job of scrapedJobs) {
        try {
          await this.jobsService.createJob({
            title: job.title,
            company: job.company,
            platform: JobPlatform.LINKEDIN,
            url: job.url,
            description: job.description,
            location: job.location,
            salary: job.salary,
          });
          savedCount++;
        } catch (error) {
          // Job might already exist (duplicate URL), continue
          this.logger.debug(`Job already exists or error saving: ${job.url}`);
        }
      }

      return savedCount;
    } catch (error) {
      this.logger.error('Error scraping LinkedIn:', error);
      throw error;
    }
  }

  private async scrapeIndeed(filters: {
    title: string;
    location: string;
    limit: number;
  }): Promise<number> {
    try {
      const scrapedJobs = await this.indeedScraper.scrapeJobs(filters);
      let savedCount = 0;

      for (const job of scrapedJobs) {
        try {
          await this.jobsService.createJob({
            title: job.title,
            company: job.company,
            platform: JobPlatform.INDEED,
            url: job.url,
            description: job.description,
            location: job.location,
            salary: job.salary,
          });
          savedCount++;
        } catch (error) {
          // Job might already exist (duplicate URL), continue
          this.logger.debug(`Job already exists or error saving: ${job.url}`);
        }
      }

      return savedCount;
    } catch (error) {
      this.logger.error('Error scraping Indeed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    // Clean up browser instances
    try {
      await this.linkedInScraper.close();
      await this.indeedScraper.close();
    } catch (error) {
      this.logger.error('Error closing browsers:', error);
    }
  }
}
