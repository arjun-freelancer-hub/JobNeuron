import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobDiscoveryService } from './job-discovery.service';
import { LinkedInScraper } from './scrapers/linkedin.scraper';
import { IndeedScraper } from './scrapers/indeed.scraper';
import { Job, JobSchema } from '../schemas/job.schema';
import { JobMatchScore, JobMatchScoreSchema } from '../schemas/job-match-score.schema';
import { AIModule } from '../ai/ai.module';
import { ResumesModule } from '../resumes/resumes.module';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: JobMatchScore.name, schema: JobMatchScoreSchema },
    ]),
    AIModule,
    ResumesModule,
    ApplicationsModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, JobDiscoveryService, LinkedInScraper, IndeedScraper],
  exports: [JobsService, JobDiscoveryService],
})
export class JobsModule {}
