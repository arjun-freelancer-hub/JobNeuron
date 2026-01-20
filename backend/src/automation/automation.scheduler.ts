import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutomationService } from './automation.service';

@Injectable()
export class AutomationScheduler {
  constructor(private automationService: AutomationService) {}

  // Run every day at 9 AM
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleDailyAutomation() {
    console.log('Running daily automation job...');

    const schedules = await this.automationService.getAllActiveSchedules();

    for (const schedule of schedules) {
      try {
        await this.automationService.runScheduledJob(schedule.userId.toString());
      } catch (error) {
        console.error(
          `Error running automation for user ${schedule.userId}:`,
          error,
        );
      }
    }
  }
}
