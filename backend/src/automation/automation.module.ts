import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { AutomationSchedule, AutomationScheduleSchema } from '../schemas/automation-schedule.schema';
import { JobsModule } from '../jobs/jobs.module';
import { ApplicationsModule } from '../applications/applications.module';
import { ResumesModule } from '../resumes/resumes.module';
import { AutomationScheduler } from './automation.scheduler';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AutomationSchedule.name, schema: AutomationScheduleSchema },
    ]),
    ScheduleModule.forRoot(),
    JobsModule,
    ApplicationsModule,
    ResumesModule,
  ],
  controllers: [AutomationController],
  providers: [AutomationService, AutomationScheduler],
  exports: [AutomationService],
})
export class AutomationModule {}
