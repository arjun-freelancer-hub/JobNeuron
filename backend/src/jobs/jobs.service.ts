import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job, JobDocument, JobPlatform } from '../schemas/job.schema';
import { AIService } from '../ai/ai.service';
import { ResumesService } from '../resumes/resumes.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private aiService: AIService,
    private resumesService: ResumesService,
  ) {}

  async discoverJobs(filters: {
    platform?: JobPlatform;
    title?: string;
    location?: string;
    limit?: number;
  }): Promise<JobDocument[]> {
    const query: any = {};

    if (filters.platform) {
      query.platform = filters.platform;
    }

    if (filters.title) {
      query.title = { $regex: filters.title, $options: 'i' };
    }

    if (filters.location) {
      query.location = { $regex: filters.location, $options: 'i' };
    }

    const limit = filters.limit || 50;

    return this.jobModel.find(query).limit(limit).sort({ createdAt: -1 }).exec();
  }

  async getJobById(id: string): Promise<JobDocument> {
    const job = await this.jobModel.findById(id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async createJob(jobData: {
    title: string;
    company: string;
    platform: JobPlatform;
    url: string;
    description: string;
    location?: string;
    salary?: string;
  }): Promise<JobDocument> {
    // Check if job already exists
    const existingJob = await this.jobModel.findOne({ url: jobData.url });
    if (existingJob) {
      return existingJob;
    }

    const job = await this.jobModel.create({
      ...jobData,
      discoveredAt: new Date(),
    });

    return job;
  }

  async calculateMatchScore(jobId: string, userId: string): Promise<number> {
    const job = await this.getJobById(jobId);
    
    // Get user's master resume
    const resumes = await this.resumesService.getUserResumes(userId);
    if (resumes.length === 0) {
      return 0;
    }

    const masterResume = resumes[0];
    // In production, you'd extract text from the resume
    // For now, we'll use a placeholder
    const resumeText = 'Resume text placeholder';

    const matchScore = await this.aiService.matchJob(
      resumeText,
      job.description,
      job.title,
    );

    // Update job with match score
    job.matchScore = matchScore;
    await job.save();

    return matchScore;
  }

  async getJobsWithMatchScores(userId: string, filters: {
    platform?: JobPlatform;
    minScore?: number;
    limit?: number;
  }): Promise<JobDocument[]> {
    const query: any = {};

    if (filters.platform) {
      query.platform = filters.platform;
    }

    if (filters.minScore !== undefined) {
      query.matchScore = { $gte: filters.minScore };
    }

    const limit = filters.limit || 50;

    return this.jobModel
      .find(query)
      .limit(limit)
      .sort({ matchScore: -1, createdAt: -1 })
      .exec();
  }
}
