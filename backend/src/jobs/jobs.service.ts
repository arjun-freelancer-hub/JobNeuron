import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job, JobDocument, JobPlatform } from '../schemas/job.schema';
import { JobMatchScore, JobMatchScoreDocument } from '../schemas/job-match-score.schema';
import { AIService } from '../ai/ai.service';
import { ResumesService } from '../resumes/resumes.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(JobMatchScore.name) private jobMatchScoreModel: Model<JobMatchScoreDocument>,
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

  async getCachedMatchScore(jobId: string, userId: string): Promise<number | null> {
    const currentResumeHash = await this.resumesService.calculateResumeHash(userId);
    if (!currentResumeHash) {
      return null;
    }

    const cachedScore = await this.jobMatchScoreModel.findOne({
      jobId: new Types.ObjectId(jobId),
      userId: new Types.ObjectId(userId),
    });

    if (!cachedScore) {
      return null;
    }

    // Check if resume hash matches - if not, cache is stale
    if (cachedScore.resumeHash !== currentResumeHash) {
      // Delete stale cache entry
      await this.jobMatchScoreModel.deleteOne({
        _id: cachedScore._id,
      });
      return null;
    }

    return cachedScore.score;
  }

  async calculateMatchScore(jobId: string, userId: string): Promise<number> {
    const job = await this.getJobById(jobId);
    
    // Check cache first
    const cachedScore = await this.getCachedMatchScore(jobId, userId);
    if (cachedScore !== null) {
      return cachedScore;
    }

    // Get user's master resume
    const resumes = await this.resumesService.getUserResumes(userId);
    if (resumes.length === 0) {
      return 0;
    }

    const masterResume = resumes[0];
    // Extract text from the resume
    const resumeText = await this.resumesService.getResumeTextFromResume(masterResume);
    
    if (!resumeText || resumeText.trim().length === 0) {
      console.warn('Resume text is empty, cannot calculate match score');
      return 0;
    }

    // Calculate resume hash
    const resumeHash = await this.resumesService.calculateResumeHash(userId);

    // Calculate match score using AI
    const matchScore = await this.aiService.matchJob(
      resumeText,
      job.description,
      job.title,
    );

    // Store in JobMatchScore collection
    await this.jobMatchScoreModel.findOneAndUpdate(
      {
        jobId: new Types.ObjectId(jobId),
        userId: new Types.ObjectId(userId),
      },
      {
        jobId: new Types.ObjectId(jobId),
        userId: new Types.ObjectId(userId),
        score: matchScore,
        resumeHash: resumeHash,
        calculatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      },
    );

    return matchScore;
  }

  async getJobsWithMatchScores(userId: string, filters: {
    platform?: JobPlatform;
    minScore?: number;
    limit?: number;
  }): Promise<Array<Record<string, any> & { matchScore?: number }>> {
    const query: any = {};

    if (filters.platform) {
      query.platform = filters.platform;
    }

    const limit = filters.limit || 50;

    // Get all jobs matching platform filter
    const jobs = await this.jobModel
      .find(query)
      .limit(limit * 2) // Get more jobs to filter by score later
      .sort({ createdAt: -1 })
      .exec();

    // Get user-specific match scores for these jobs
    const jobIds = jobs.map((job) => job._id);
    const matchScores = await this.jobMatchScoreModel.find({
      jobId: { $in: jobIds },
      userId: new Types.ObjectId(userId),
    });

    // Create a map of jobId -> score for quick lookup
    const scoreMap = new Map<string, number>();
    matchScores.forEach((ms) => {
      scoreMap.set(ms.jobId.toString(), ms.score);
    });

    // Attach scores to jobs and filter by minScore if specified
    const jobsWithScores = jobs
      .map((job) => {
        const score = scoreMap.get(job._id.toString());
        const jobObj = job.toObject();
        return {
          ...jobObj,
          matchScore: score,
        };
      })
      .filter((job) => {
        // If minScore is specified, only include jobs with score >= minScore
        if (filters.minScore !== undefined) {
          return job.matchScore !== undefined && job.matchScore >= filters.minScore;
        }
        // If no minScore filter, include all jobs (with or without scores)
        return true;
      })
      .sort((a, b) => {
        // Sort by matchScore descending, then by createdAt descending
        const scoreA = a.matchScore ?? -1;
        const scoreB = b.matchScore ?? -1;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        // createdAt is added by Mongoose timestamps but not in TypeScript type
        const dateA = (a as Record<string, any>).createdAt ? new Date((a as Record<string, any>).createdAt).getTime() : 0;
        const dateB = (b as Record<string, any>).createdAt ? new Date((b as Record<string, any>).createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit); // Apply limit after filtering and sorting

    return jobsWithScores;
  }
}
