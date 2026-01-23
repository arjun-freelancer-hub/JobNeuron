import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutomationService } from './automation.service';
import { JobDiscoveryService } from '../jobs/job-discovery.service';
import { JobPlatform } from '../schemas/job.schema';

@Injectable()
export class AutomationScheduler {
  private readonly logger = new Logger(AutomationScheduler.name);

  constructor(
    private automationService: AutomationService,
    private jobDiscoveryService: JobDiscoveryService,
  ) {}

  // Run every day at 9 AM
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleDailyAutomation() {
    this.logger.log('Running daily automation job...');

    const schedules = await this.automationService.getAllActiveSchedules();

    for (const schedule of schedules) {
      try {
        await this.automationService.runScheduledJob(schedule.userId.toString());
      } catch (error) {
        this.logger.error(
          `Error running automation for user ${schedule.userId}:`,
          error,
        );
      }
    }
  }

  // Run job discovery daily at 8 AM (before automation at 9 AM)
  @Cron('0 8 * * *')
  async handleDailyJobDiscovery() {
    this.logger.log('Running daily job discovery...');

    const schedules = await this.automationService.getAllActiveSchedules();

    for (const schedule of schedules) {
      try {
        // Discover jobs for each platform in the schedule
        for (const platform of schedule.platforms) {
          try {
            const result = await this.jobDiscoveryService.discoverJobs({
              platform: platform,
              title: 'software engineer', // Default, could be from user preferences
              location: 'remote', // Default, could be from user preferences
              limit: 50, // Discover up to 50 jobs per platform
            });
            this.logger.log(
              `Discovered ${result.count} jobs from ${platform} for user ${schedule.userId}`,
            );
          } catch (error) {
            this.logger.error(
              `Error discovering jobs from ${platform} for user ${schedule.userId}:`,
              error,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Error in job discovery for user ${schedule.userId}:`,
          error,
        );
      }
    }
  }
}
