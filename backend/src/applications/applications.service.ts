import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Application, ApplicationDocument, ApplicationStatus } from '../schemas/application.schema';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class ApplicationsService {
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
    // Create application record
    const application = await this.applicationModel.create({
      userId: new Types.ObjectId(userId),
      jobId: new Types.ObjectId(jobId),
      resumeId: new Types.ObjectId(resumeId),
      status: ApplicationStatus.PENDING,
    });

    // Add to queue for processing
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
    const updateData: any = {
      status,
    };

    if (status === ApplicationStatus.SUCCESS) {
      updateData.appliedAt = new Date();
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
}
