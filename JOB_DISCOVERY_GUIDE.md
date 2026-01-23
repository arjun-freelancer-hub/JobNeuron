# Job Discovery Guide

## Current State

**⚠️ Job scraping/discovery is NOT yet implemented.** The system currently only supports:
- Manual job creation via API
- Querying existing jobs from the database

## How Jobs Are Currently Added

### Option 1: Manual Creation via API

You can manually add jobs using the `POST /jobs` endpoint:

```bash
# Get your auth token first
TOKEN="your-jwt-token"

# Add a job
curl -X POST http://localhost:3002/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Software Engineer",
    "company": "Tech Corp",
    "platform": "LINKEDIN",
    "url": "https://linkedin.com/jobs/view/123456",
    "description": "We are looking for a senior software engineer...",
    "location": "San Francisco, CA",
    "salary": "$120k - $180k"
  }'
```

### Option 2: Direct Database Insert (for testing)

You can also insert jobs directly into MongoDB for testing purposes.

## Missing: Job Discovery/Scraping

According to the PRD, the system should discover jobs from:
- **LinkedIn** - Job listings
- **Indeed** - Job listings  
- **Wellfound** - Startup jobs
- **Company career pages** - Direct company sites

### What Needs to Be Implemented

You need to create a **Job Discovery Service** that:

1. **Scrapes job listings** from platforms (LinkedIn, Indeed, etc.)
2. **Extracts job data** (title, company, description, URL, etc.)
3. **Calls `jobsService.createJob()`** to save to database
4. **Runs on a schedule** or on-demand

### Implementation Approach

#### Option A: Web Scraping with Playwright (Recommended)

Since you already have Playwright in the automation worker, you can create a job discovery service:

```typescript
// backend/src/jobs/job-discovery.service.ts
@Injectable()
export class JobDiscoveryService {
  async discoverLinkedInJobs(filters: {
    title: string;
    location: string;
    limit: number;
  }): Promise<void> {
    // Use Playwright to scrape LinkedIn job search
    // Extract job data
    // Call jobsService.createJob() for each job
  }
  
  async discoverIndeedJobs(filters: {
    title: string;
    location: string;
    limit: number;
  }): Promise<void> {
    // Similar for Indeed
  }
}
```

#### Option B: Use Job APIs (if available)

Some platforms offer APIs:
- **LinkedIn**: Requires API access (limited)
- **Indeed**: Has a partner API (requires approval)
- **Wellfound**: May have API access

#### Option C: RSS Feeds / Sitemaps

Some job boards provide RSS feeds or sitemaps that can be parsed.

## Recommended Implementation Steps

### Step 1: Create Job Discovery Service

```typescript
// backend/src/jobs/job-discovery.service.ts
import { Injectable } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobPlatform } from '../schemas/job.schema';

@Injectable()
export class JobDiscoveryService {
  constructor(private jobsService: JobsService) {}

  async discoverJobs(filters: {
    platform: JobPlatform;
    title: string;
    location: string;
    limit: number;
  }): Promise<number> {
    let jobsFound = 0;
    
    switch (filters.platform) {
      case JobPlatform.LINKEDIN:
        jobsFound = await this.scrapeLinkedIn(filters);
        break;
      case JobPlatform.INDEED:
        jobsFound = await this.scrapeIndeed(filters);
        break;
      // ... other platforms
    }
    
    return jobsFound;
  }

  private async scrapeLinkedIn(filters: {
    title: string;
    location: string;
    limit: number;
  }): Promise<number> {
    // TODO: Implement LinkedIn scraping
    // Use Playwright or Puppeteer
    // Extract: title, company, description, url, location
    // Call: this.jobsService.createJob() for each job
    return 0;
  }

  private async scrapeIndeed(filters: {
    title: string;
    location: string;
    limit: number;
  }): Promise<number> {
    // TODO: Implement Indeed scraping
    return 0;
  }
}
```

### Step 2: Add Discovery Endpoint

```typescript
// backend/src/jobs/jobs.controller.ts
@Post('discover')
@UseGuards(JwtAuthGuard)
async discoverAndAddJobs(
  @Body() body: {
    platform: JobPlatform;
    title: string;
    location: string;
    limit: number;
  },
) {
  const count = await this.jobDiscoveryService.discoverJobs(body);
  return { message: `Discovered and added ${count} jobs` };
}
```

### Step 3: Schedule Automatic Discovery

```typescript
// backend/src/automation/automation.scheduler.ts
@Cron('0 9 * * *') // Daily at 9 AM
async discoverNewJobs() {
  // Run discovery for all active schedules
  const schedules = await this.automationService.getAllActiveSchedules();
  
  for (const schedule of schedules) {
    await this.jobDiscoveryService.discoverJobs({
      platform: schedule.platforms[0],
      title: 'software engineer', // or from user preferences
      location: 'remote',
      limit: 100,
    });
  }
}
```

## Testing Without Job Discovery

For now, you can test the automation flow by manually adding jobs:

### Quick Test Script

```bash
#!/bin/bash
# test-add-job.sh

TOKEN="your-jwt-token"
API_URL="http://localhost:3002"

curl -X POST "$API_URL/jobs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Full Stack Developer",
    "company": "Test Company",
    "platform": "LINKEDIN",
    "url": "https://linkedin.com/jobs/view/test-123",
    "description": "We are looking for a full stack developer with experience in React and Node.js. Must have 5+ years of experience.",
    "location": "Remote",
    "salary": "$100k - $150k"
  }'
```

## Next Steps

1. **For Testing**: Use manual job creation (Option 1 above)
2. **For Production**: Implement job discovery service using Playwright
3. **Consider**: Using job APIs if available (more reliable than scraping)
4. **Legal Note**: Make sure scraping complies with platform ToS

## Example: LinkedIn Scraping with Playwright

```typescript
import { chromium } from 'playwright';

async scrapeLinkedIn(filters: {
  title: string;
  location: string;
  limit: number;
}): Promise<number> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to LinkedIn job search
  const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(filters.title)}&location=${encodeURIComponent(filters.location)}`;
  await page.goto(searchUrl);
  
  // Wait for job listings to load
  await page.waitForSelector('.jobs-search-results-list');
  
  // Extract job data
  const jobs = await page.evaluate(() => {
    const jobCards = document.querySelectorAll('.job-card-container');
    return Array.from(jobCards).slice(0, filters.limit).map(card => ({
      title: card.querySelector('.job-card-list__title')?.textContent?.trim(),
      company: card.querySelector('.job-card-container__company-name')?.textContent?.trim(),
      url: card.querySelector('a')?.href,
      location: card.querySelector('.job-card-container__metadata-item')?.textContent?.trim(),
    }));
  });
  
  // Save to database
  for (const job of jobs) {
    if (job.title && job.company && job.url) {
      await this.jobsService.createJob({
        title: job.title,
        company: job.company,
        platform: JobPlatform.LINKEDIN,
        url: job.url,
        description: '', // Would need to visit job page for full description
        location: job.location,
      });
    }
  }
  
  await browser.close();
  return jobs.length;
}
```

**Note**: This is a simplified example. Real implementation would need:
- Handling pagination
- Extracting full job descriptions
- Handling rate limiting
- Error handling
- Authentication (if required)
