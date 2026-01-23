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
  }): Promise<Array<Record<string, any> & { matchScore: number | null }>> {
    const limit = filters.limit || 50;
    const userIdObj = new Types.ObjectId(userId);

    // Build aggregation pipeline
    const pipeline: any[] = [];

    // Stage 1: Match jobs by platform filter
    const matchStage: any = {};
    if (filters.platform) {
      matchStage.platform = filters.platform;
    }
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Stage 2: Lookup match scores from JobMatchScore collection
    const matchScoreCollectionName = this.jobMatchScoreModel.collection.name;
    pipeline.push({
      $lookup: {
        from: matchScoreCollectionName,
        let: { jobId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$jobId', '$$jobId'] },
                  { $eq: ['$userId', userIdObj] },
                ],
              },
            },
          },
        ],
        as: 'matchScoreData',
      },
    });

    // Stage 3: Add matchScore field (extract from lookup result or default to null to track missing scores)
    pipeline.push({
      $addFields: {
        matchScore: {
          $ifNull: [
            { $arrayElemAt: ['$matchScoreData.score', 0] },
            null,
          ],
        },
        hasMatchScore: {
          $gt: [{ $size: '$matchScoreData' }, 0],
        },
      },
    });

    // Stage 4: Remove the temporary matchScoreData array
    pipeline.push({
      $unset: 'matchScoreData',
    });

    // Stage 5: Sort by matchScore descending (nulls last), then by createdAt descending
    pipeline.push({
      $sort: {
        matchScore: -1, // -1 means descending, nulls will be sorted last
        createdAt: -1,
      },
    });

    // Stage 6: Apply limit
    pipeline.push({
      $limit: limit,
    });

    // Execute aggregation
    const jobsWithScores = await this.jobModel.aggregate(pipeline).exec();

    // Filter by minScore if specified (only jobs with scores >= minScore)
    let filteredJobs = jobsWithScores;
    if (filters.minScore !== undefined) {
      filteredJobs = jobsWithScores.filter(
        (job) => job.matchScore !== null && job.matchScore !== undefined && job.matchScore >= filters.minScore!
      );
    }

    // Return jobs with matchScore (null if not calculated yet)
    return filteredJobs.map((job) => {
      const { hasMatchScore, ...rest } = job;
      return { 
        ...rest, 
        matchScore: job.matchScore !== null && job.matchScore !== undefined ? job.matchScore : null 
      };
    });
  }
}
