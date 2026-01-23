import { chromium, Browser, Page } from 'playwright';
import { Injectable, Logger } from '@nestjs/common';

export interface ScrapedJob {
  title: string;
  company: string;
  url: string;
  description: string;
  location?: string;
  salary?: string;
}

@Injectable()
export class IndeedScraper {
  private readonly logger = new Logger(IndeedScraper.name);
  private browser: Browser | null = null;

  async scrapeJobs(filters: {
    title: string;
    location: string;
    limit: number;
  }): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];
    let page: Page | null = null;

    try {
      const browser = await this.getBrowser();
      const context = await browser.newContext({
        userAgent: this.getRandomUserAgent(),
        viewport: { width: 1920, height: 1080 },
      });

      page = await context.newPage();

      // Build Indeed job search URL
      const searchParams = new URLSearchParams();
      if (filters.title) {
        searchParams.append('q', filters.title);
      }
      if (filters.location) {
        searchParams.append('l', filters.location);
      }
      searchParams.append('fromage', '1'); // Last 24 hours
      searchParams.append('sort', 'date'); // Sort by date

      const searchUrl = `https://www.indeed.com/jobs?${searchParams.toString()}`;
      this.logger.log(`Scraping Indeed: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await this.randomDelay(2000, 3000);

      // Wait for job listings to load
      try {
        await page.waitForSelector('#mosaic-provider-jobcards', { timeout: 10000 });
      } catch (error) {
        this.logger.warn('Job listings container not found, trying alternative selectors');
      }

      // Extract job cards
      const jobCards = await page.$$eval(
        'div[data-jk], .job_seen_beacon, .slider_item',
        (cards, limit) => {
          return cards.slice(0, limit).map((card) => {
            const titleElement = card.querySelector('h2.jobTitle a, h2.jobTitle span');
            const companyElement = card.querySelector(
              '[data-testid="company-name"], .companyName',
            );
            const locationElement = card.querySelector(
              '[data-testid="text-location"], .companyLocation',
            );
            const salaryElement = card.querySelector(
              '[data-testid="attribute_snippet_testid"], .salary-snippet-container',
            );
            const linkElement = card.querySelector('h2.jobTitle a, a[data-jk]') as HTMLAnchorElement | null;

            const jobId = card.getAttribute('data-jk');
            const href = linkElement?.getAttribute('href') || linkElement?.href;
            const url = href
              ? href.startsWith('http')
                ? href
                : `https://www.indeed.com${href}`
              : jobId
                ? `https://www.indeed.com/viewjob?jk=${jobId}`
                : '';

            return {
              title: titleElement?.textContent?.trim() || '',
              company: companyElement?.textContent?.trim() || '',
              location: locationElement?.textContent?.trim() || '',
              salary: salaryElement?.textContent?.trim() || '',
              url: url,
              jobId: jobId || '',
            };
          });
        },
        filters.limit,
      );

      this.logger.log(`Found ${jobCards.length} job cards on Indeed`);

      // Visit each job page to get full description
      for (let i = 0; i < jobCards.length && jobs.length < filters.limit; i++) {
        const card = jobCards[i];
        if (!card.title || !card.company || !card.url) {
          continue;
        }

        try {
          const jobDetails = await this.extractJobDetails(page, card.url);
          if (jobDetails) {
            jobs.push({
              title: card.title,
              company: card.company,
              url: card.url,
              description: jobDetails.description,
              location: card.location || jobDetails.location,
              salary: card.salary || jobDetails.salary,
            });
            this.logger.log(`Scraped job: ${card.title} at ${card.company}`);
          }

          // Rate limiting - delay between requests
          if (i < jobCards.length - 1) {
            await this.randomDelay(2000, 4000);
          }
        } catch (error) {
          this.logger.error(`Error scraping job ${card.url}:`, error);
          // Continue with next job even if one fails
        }
      }

      await context.close();
    } catch (error) {
      this.logger.error('Error in Indeed scraping:', error);
      if (page) {
        await page.close().catch(() => {});
      }
    }

    return jobs;
  }

  private async extractJobDetails(page: Page, jobUrl: string): Promise<{
    description: string;
    location?: string;
    salary?: string;
  } | null> {
    try {
      await page.goto(jobUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await this.randomDelay(1500, 2500);

      const details = await page.evaluate(() => {
        // Try multiple selectors for description
        const descriptionSelectors = [
          '#jobDescriptionText',
          '.jobsearch-jobDescriptionText',
          '[data-testid="job-description"]',
          '.jobsearch-JobComponent-description',
        ];

        let description = '';
        for (const selector of descriptionSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            description = element.textContent?.trim() || '';
            if (description) break;
          }
        }

        // Extract location
        const locationSelectors = [
          '[data-testid="job-location"]',
          '.jobsearch-JobInfoHeader-subtitle',
          '.jobsearch-InlineCompanyRating',
        ];

        let location = '';
        for (const selector of locationSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const text = element.textContent?.trim() || '';
            // Location is usually after company name
            if (text && !text.includes('★')) {
              location = text;
              break;
            }
          }
        }

        // Extract salary
        const salarySelectors = [
          '[data-testid="attribute_snippet_testid"]',
          '.jobsearch-JobMetadataHeader-item',
          '.salary-snippet-container',
        ];

        let salary = '';
        for (const selector of salarySelectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of Array.from(elements)) {
            const text = element.textContent?.trim() || '';
            if (text.includes('$') || text.includes('hour') || text.includes('year')) {
              salary = text;
              break;
            }
          }
          if (salary) break;
        }

        return { description, location, salary };
      });

      return details.description ? details : null;
    } catch (error) {
      this.logger.error(`Error extracting details from ${jobUrl}:`, error);
      return null;
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
      });
    }
    return this.browser;
  }

  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
