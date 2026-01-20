import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AutomationSchedule, AutomationScheduleDocument } from '../schemas/automation-schedule.schema';
import { JobsService } from '../jobs/jobs.service';
import { ApplicationsService } from '../applications/applications.service';
import { ResumesService } from '../resumes/resumes.service';
import { JobPlatform } from '../schemas/job.schema';

@Injectable()
export class AutomationService {
  constructor(
    @InjectModel(AutomationSchedule.name)
    private scheduleModel: Model<AutomationScheduleDocument>,
    private jobsService: JobsService,
    private applicationsService: ApplicationsService,
    private resumesService: ResumesService,
  ) {}

  async createOrUpdateSchedule(
    userId: string,
    scheduleData: {
      cronExpression: string;
      maxJobsPerDay: number;
      platforms: JobPlatform[];
      isActive: boolean;
    },
  ): Promise<AutomationScheduleDocument> {
    const existingSchedule = await this.scheduleModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (existingSchedule) {
      existingSchedule.cronExpression = scheduleData.cronExpression;
      existingSchedule.maxJobsPerDay = scheduleData.maxJobsPerDay;
      existingSchedule.platforms = scheduleData.platforms;
      existingSchedule.isActive = scheduleData.isActive;
      await existingSchedule.save();
      return existingSchedule;
    }

    const schedule = await this.scheduleModel.create({
      userId: new Types.ObjectId(userId),
      ...scheduleData,
    });

    return schedule;
  }

  async getSchedule(userId: string): Promise<AutomationScheduleDocument | null> {
    return this.scheduleModel.findOne({ userId: new Types.ObjectId(userId) });
  }

  async runScheduledJob(userId: string): Promise<void> {
    const schedule = await this.getSchedule(userId);
    if (!schedule || !schedule.isActive) {
      return;
    }

    // Get user's resume
    const resumes = await this.resumesService.getUserResumes(userId);
    if (resumes.length === 0) {
      console.log(`No resume found for user ${userId}`);
      return;
    }

    const resume = resumes[0];

    // Discover jobs based on schedule filters
    const jobs = await this.jobsService.getJobsWithMatchScores(userId, {
      platform: schedule.platforms[0], // For now, use first platform
      minScore: 7, // Auto-apply for jobs with score >= 7
      limit: schedule.maxJobsPerDay,
    });

    // Get today's application count
    const stats = await this.applicationsService.getApplicationStats(userId);
    const remainingSlots = schedule.maxJobsPerDay - stats.appliedToday;

    if (remainingSlots <= 0) {
      console.log(`Daily limit reached for user ${userId}`);
      return;
    }

    // Apply to jobs (up to remaining slots)
    const jobsToApply = jobs.slice(0, remainingSlots);

    for (const job of jobsToApply) {
      try {
        await this.applicationsService.createApplication(
          userId,
          job._id.toString(),
          resume._id.toString(),
          job.url,
          job.platform,
        );
        console.log(`Queued application for job ${job._id} by user ${userId}`);
      } catch (error) {
        console.error(`Error creating application for job ${job._id}:`, error);
      }
    }
  }

  async getAllActiveSchedules(): Promise<AutomationScheduleDocument[]> {
    return this.scheduleModel.find({ isActive: true }).exec();
  }
}
