import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Application, ApplicationDocument, ApplicationStatus } from '../schemas/application.schema';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    private queueService: QueueService,
  ) {}

  async createApplication(
    userId: string,
    jobId: string,
    resumeId: string,
    jobUrl: string,
    platform: string,
    email?: string,
    phone?: string,
  ): Promise<ApplicationDocument> {
    this.logger.log(`[Applications] Creating application: userId=${userId}, jobId=${jobId}, platform=${platform}`);
    
    // Check if application already exists
    const existingApplication = await this.applicationModel.findOne({
      userId: new Types.ObjectId(userId),
      jobId: new Types.ObjectId(jobId),
    });

    if (existingApplication) {
      this.logger.warn(`[Applications] Duplicate application detected: userId=${userId}, jobId=${jobId}`);
      throw new BadRequestException('You have already applied to this job');
    }
    
    // Create application record
    const application = await this.applicationModel.create({
      userId: new Types.ObjectId(userId),
      jobId: new Types.ObjectId(jobId),
      resumeId: new Types.ObjectId(resumeId),
      status: ApplicationStatus.PENDING,
    });

    this.logger.log(`[Applications] Application created: applicationId=${application._id}`);

    // Add to queue for processing
    this.logger.log(`[Applications] Adding application to queue...`);
    await this.queueService.addApplicationJob({
      applicationId: application._id.toString(),
      userId,
      jobId,
      resumeId,
      platform,
      jobUrl,
      email,
      phone,
    });

    this.logger.log(`[Applications] ✅ Application ${application._id} queued for processing`);
    return application;
  }

  async getUserApplications(userId: string): Promise<ApplicationDocument[]> {
    return this.applicationModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('jobId')
      .populate('resumeId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getApplicationById(id: string, userId: string): Promise<ApplicationDocument> {
    const application = await this.applicationModel
      .findOne({
        _id: id,
        userId: new Types.ObjectId(userId),
      })
      .populate('jobId')
      .populate('resumeId');

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    errorMessage?: string,
  ): Promise<ApplicationDocument> {
    this.logger.log(`[Applications] Updating application ${id} status to ${status}`);
    
    const updateData: any = {
      status,
    };

    if (status === ApplicationStatus.SUCCESS) {
      updateData.appliedAt = new Date();
      this.logger.log(`[Applications] ✅ Application ${id} marked as SUCCESS`);
    } else if (status === ApplicationStatus.FAILED) {
      this.logger.warn(`[Applications] ❌ Application ${id} marked as FAILED`);
      if (errorMessage) {
        this.logger.warn(`[Applications] ❌ Error: ${errorMessage}`);
      }
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    const application = await this.applicationModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async getApplicationStats(userId: string) {
    const stats = await this.applicationModel.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await this.applicationModel.countDocuments({
      userId: new Types.ObjectId(userId),
    });

    const successCount = stats.find((s) => s._id === ApplicationStatus.SUCCESS)?.count || 0;
    const successRate = total > 0 ? (successCount / total) * 100 : 0;

    // Get today's applications
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appliedToday = await this.applicationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      appliedAt: { $gte: today },
      status: ApplicationStatus.SUCCESS,
    });

    return {
      total,
      appliedToday,
      successRate: parseFloat(successRate.toFixed(2)),
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  async getApplicationByJobId(userId: string, jobId: string): Promise<ApplicationDocument | null> {
    return this.applicationModel
      .findOne({
        userId: new Types.ObjectId(userId),
        jobId: new Types.ObjectId(jobId),
      })
      .exec();
  }
}
