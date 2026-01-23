import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobDiscoveryService } from './job-discovery.service';
import { ApplicationsService } from '../applications/applications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JobPlatform } from '../schemas/job.schema';
import type { UserDocument } from '../schemas/user.schema';
import { DiscoverJobsDto } from './dto/discover-jobs.dto';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly jobDiscoveryService: JobDiscoveryService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  @Get('discover')
  async discoverJobs(
    @Query('platform') platform?: JobPlatform,
    @Query('title') title?: string,
    @Query('location') location?: string,
    @Query('limit') limit?: number,
  ) {
    return this.jobsService.discoverJobs({
      platform,
      title,
      location,
      limit: limit ? parseInt(limit.toString()) : undefined,
    });
  }

  @Get('matched')
  @UseGuards(JwtAuthGuard)
  async getMatchedJobs(
    @Query('platform') platform?: JobPlatform,
    @Query('minScore') minScore?: number,
    @Query('limit') limit?: number,
    @GetUser() user?: UserDocument,
  ) {
    if (!user) {
      return [];
    }

    const jobs = await this.jobsService.getJobsWithMatchScores(user._id.toString(), {
      platform,
      minScore: minScore ? parseFloat(minScore.toString()) : undefined,
      limit: limit ? parseInt(limit.toString()) : undefined,
    });

    // Fetch application status for each job
    const jobsWithApplications = await Promise.all(
      jobs.map(async (job) => {
        const application = await this.applicationsService.getApplicationByJobId(
          user._id.toString(),
          job._id.toString(),
        );
        return {
          ...job,
          application: application
            ? {
                _id: application._id.toString(),
                status: application.status,
                appliedAt: application.appliedAt,
                errorMessage: application.errorMessage,
              }
            : null,
        };
      }),
    );

    return jobsWithApplications;
  }

  @Get(':id/match-score')
  @UseGuards(JwtAuthGuard)
  async getMatchScore(
    @Param('id') id: string,
    @GetUser() user: UserDocument,
  ) {
    try {
      const score = await this.jobsService.calculateMatchScore(id, user._id.toString());
      return { matchScore: score };
    } catch (error) {
      // Re-throw NestJS exceptions (like NotFoundException)
      if (error instanceof Error && error.constructor.name.includes('Exception')) {
        throw error;
      }
      // Handle other errors
      console.error('Error calculating match score:', error);
      throw error;
    }
  }

  @Get(':id')
  async getJobById(@Param('id') id: string) {
    return this.jobsService.getJobById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createJob(@Body() jobData: {
    title: string;
    company: string;
    platform: JobPlatform;
    url: string;
    description: string;
    location?: string;
    salary?: string;
  }) {
    return this.jobsService.createJob(jobData);
  }

  @Post('discover')
  @UseGuards(JwtAuthGuard)
  async discoverAndAddJobs(@Body() discoverDto: DiscoverJobsDto) {
    const result = await this.jobDiscoveryService.discoverJobs({
      platform: discoverDto.platform,
      title: discoverDto.title || '',
      location: discoverDto.location || '',
      limit: discoverDto.limit || 20,
    });
    return result;
  }
}
