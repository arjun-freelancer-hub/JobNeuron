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
export class LinkedInScraper {
  private readonly logger = new Logger(LinkedInScraper.name);
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

      // Build LinkedIn job search URL
      const searchParams = new URLSearchParams();
      if (filters.title) {
        searchParams.append('keywords', filters.title);
      }
      if (filters.location) {
        searchParams.append('location', filters.location);
      }
      searchParams.append('f_TPR', 'r86400'); // Last 24 hours
      searchParams.append('f_E', '2'); // Full-time
      searchParams.append('f_WT', '2'); // Remote

      const searchUrl = `https://www.linkedin.com/jobs/search?${searchParams.toString()}`;
      this.logger.log(`Scraping LinkedIn: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await this.randomDelay(3000, 5000); // Increased delay for LinkedIn to load

      // Wait for job listings to load - try multiple selectors
      let jobListLoaded = false;
      const selectors = [
        '.jobs-search-results-list',
        '.scaffold-layout__list-container',
        '[data-test-id="job-search-results-list"]',
        'ul.jobs-search__results-list',
      ];

      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          this.logger.debug(`Found job listings container with selector: ${selector}`);
          jobListLoaded = true;
          break;
        } catch (error) {
          // Try next selector
        }
      }

      if (!jobListLoaded) {
        this.logger.warn('Job listings container not found, trying to extract jobs anyway');
        // Take a screenshot for debugging (optional)
        // await page.screenshot({ path: 'linkedin-debug.png' });
      }

      // Wait a bit more for dynamic content to load
      await this.randomDelay(2000, 3000);

      // Extract job cards - try multiple selector combinations
      let jobCards: any[] = [];
      
      // Try multiple selector strategies
      const cardSelectors = [
        'li.jobs-search-results__list-item',
        'div.job-card-container',
        'div.base-card',
        'li[data-occludable-job-id]',
        'div.scaffold-layout__list-item',
      ];

      for (const cardSelector of cardSelectors) {
        try {
          jobCards = await page.$$eval(
            cardSelector,
            (cards, limit) => {
              return cards.slice(0, limit).map((card) => {
                // Try multiple title selectors
                const titleSelectors = [
                  '.job-card-list__title',
                  '.base-search-card__title',
                  'a[data-control-name="job_card_title"]',
                  'h3.base-search-card__title',
                  'span.job-search-card__title',
                ];
                
                let titleElement: Element | null = null;
                for (const sel of titleSelectors) {
                  titleElement = card.querySelector(sel);
                  if (titleElement) break;
                }

                // Try multiple company selectors
                const companySelectors = [
                  '.job-card-container__company-name',
                  '.base-search-card__subtitle',
                  'a[data-control-name="job_card_company_link"]',
                  'h4.base-search-card__subtitle',
                  'span.job-search-card__subtitle',
                ];
                
                let companyElement: Element | null = null;
                for (const sel of companySelectors) {
                  companyElement = card.querySelector(sel);
                  if (companyElement) break;
                }

                // Try multiple location selectors
                const locationSelectors = [
                  '.job-card-container__metadata-item',
                  '.job-search-card__location',
                  'span.job-search-card__location',
                  '.base-search-card__metadata',
                ];
                
                let locationElement: Element | null = null;
                for (const sel of locationSelectors) {
                  locationElement = card.querySelector(sel);
                  if (locationElement) break;
                }

                // Find link - try multiple approaches
                let linkElement: HTMLAnchorElement | null = null;
                const linkSelectors = [
                  'a[data-control-name="job_card_title"]',
                  'a.job-card-list__title-link',
                  'a.base-card__full-link',
                  'a',
                ];
                
                for (const sel of linkSelectors) {
                  linkElement = card.querySelector(sel) as HTMLAnchorElement | null;
                  if (linkElement && linkElement.href) break;
                }

                const title = titleElement?.textContent?.trim() || '';
                const company = companyElement?.textContent?.trim() || '';
                const location = locationElement?.textContent?.trim() || '';
                let url = linkElement?.getAttribute('href') || linkElement?.href || '';
                
                // Ensure URL is absolute
                if (url && !url.startsWith('http')) {
                  url = `https://www.linkedin.com${url}`;
                }

                return {
                  title,
                  company,
                  location,
                  url,
                };
              });
            },
            filters.limit,
          );

          if (jobCards.length > 0) {
            this.logger.debug(`Found ${jobCards.length} job cards using selector: ${cardSelector}`);
            break;
          }
        } catch (error) {
          // Try next selector
          continue;
        }
      }

      this.logger.log(`Found ${jobCards.length} job cards on LinkedIn`);
      
      // If no jobs found, log page structure for debugging
      if (jobCards.length === 0) {
        this.logger.warn('No job cards found. This could indicate:');
        this.logger.warn('1. LinkedIn requires login/authentication');
        this.logger.warn('2. LinkedIn has changed their HTML structure');
        this.logger.warn('3. The page is showing a different view (e.g., "no results")');
        
        // Check if page shows login requirement
        const pageContent = await page.content();
        if (pageContent.includes('sign in') || pageContent.includes('Sign In')) {
          this.logger.error('LinkedIn appears to require authentication');
        }
      }

      // Visit each job page to get full description
      for (let i = 0; i < jobCards.length && jobs.length < filters.limit; i++) {
        const card = jobCards[i];
        if (!card.title || !card.company || !card.url) {
          continue;
        }

        try {
          const jobDetails = await this.extractJobDetails(page, card.url);
          if (jobDetails && jobDetails.description) {
            jobs.push({
              title: card.title,
              company: card.company,
              url: card.url,
              description: jobDetails.description,
              location: card.location || jobDetails.location,
              salary: jobDetails.salary,
            });
            this.logger.log(`Scraped job: ${card.title} at ${card.company}`);
          } else {
            // If we couldn't get details, still add the job with basic info from the card
            // This ensures we don't lose jobs due to timeout issues
            if (card.title && card.company) {
              jobs.push({
                title: card.title,
                company: card.company,
                url: card.url,
                description: `Job listing for ${card.title} at ${card.company}. Full description could not be retrieved.`,
                location: card.location,
                salary: undefined,
              });
              this.logger.debug(`Added job without full description: ${card.title} at ${card.company}`);
            }
          }

          // Rate limiting - delay between requests (increased to avoid rate limiting)
          if (i < jobCards.length - 1) {
            await this.randomDelay(3000, 5000);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Error scraping job ${card.url}: ${errorMessage}`);
          
          // Even if extraction fails, try to add the job with basic info
          if (card.title && card.company) {
            jobs.push({
              title: card.title,
              company: card.company,
              url: card.url,
              description: `Job listing for ${card.title} at ${card.company}. Description extraction failed.`,
              location: card.location,
              salary: undefined,
            });
            this.logger.debug(`Added job with fallback description: ${card.title} at ${card.company}`);
          }
        }
      }

      await context.close();
    } catch (error) {
      this.logger.error('Error in LinkedIn scraping:', error);
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
      // Use 'domcontentloaded' instead of 'networkidle' for faster loading
      // LinkedIn pages can take a long time to reach networkidle due to analytics/tracking
      await page.goto(jobUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 20000 // Reduced timeout to fail faster
      });
      
      // Wait a bit for dynamic content, but don't wait for networkidle
      await this.randomDelay(2000, 3000);
      
      // Try to wait for description element to appear (with timeout)
      try {
        await page.waitForSelector('.show-more-less-html__markup, .description__text, .jobs-description__text', {
          timeout: 10000
        });
      } catch (error) {
        // If description doesn't appear, try to extract anyway
        this.logger.debug(`Description element not found for ${jobUrl}, attempting extraction anyway`);
      }

      const details = await page.evaluate(() => {
        // Try multiple selectors for description
        const descriptionSelectors = [
          '.show-more-less-html__markup',
          '.description__text',
          '.jobs-description__text',
          '[data-test-id="job-description"]',
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
          '.jobs-unified-top-card__primary-description-without-tagline',
          '.jobs-unified-top-card__bullet',
          '.job-details-jobs-unified-top-card__primary-description',
        ];

        let location = '';
        for (const selector of locationSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            location = element.textContent?.trim() || '';
            if (location) break;
          }
        }

        // Extract salary
        const salaryElement = document.querySelector(
          '.job-details-jobs-unified-top-card__job-insight',
        );
        const salary = salaryElement?.textContent?.includes('$')
          ? salaryElement.textContent.trim()
          : '';

        return { description, location, salary };
      });

      return details.description ? details : null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle timeout errors gracefully
      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        this.logger.warn(`Timeout extracting details from ${jobUrl} - LinkedIn may be slow or blocking requests`);
      } else {
        this.logger.error(`Error extracting details from ${jobUrl}:`, error);
      }
      
      // Return null to skip this job and continue with others
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
