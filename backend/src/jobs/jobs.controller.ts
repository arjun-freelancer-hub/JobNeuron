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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JobPlatform } from '../schemas/job.schema';
import type { UserDocument } from '../schemas/user.schema';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

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

    return this.jobsService.getJobsWithMatchScores(user._id.toString(), {
      platform,
      minScore: minScore ? parseFloat(minScore.toString()) : undefined,
      limit: limit ? parseInt(limit.toString()) : undefined,
    });
  }

  @Get(':id')
  async getJobById(@Param('id') id: string) {
    return this.jobsService.getJobById(id);
  }

  @Get(':id/match-score')
  @UseGuards(JwtAuthGuard)
  async getMatchScore(
    @Param('id') id: string,
    @GetUser() user: UserDocument,
  ) {
    const score = await this.jobsService.calculateMatchScore(id, user._id.toString());
    return { matchScore: score };
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
}
