import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AutomationService } from './automation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JobPlatform } from '../schemas/job.schema';
import type { UserDocument } from '../schemas/user.schema';

@Controller('automation')
@UseGuards(JwtAuthGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post('schedule')
  async createOrUpdateSchedule(
    @Body() body: {
      cronExpression: string;
      maxJobsPerDay: number;
      platforms: JobPlatform[];
      isActive: boolean;
    },
    @GetUser() user: UserDocument,
  ) {
    return this.automationService.createOrUpdateSchedule(user._id.toString(), body);
  }

  @Get('settings')
  async getSchedule(@GetUser() user: UserDocument) {
    return this.automationService.getSchedule(user._id.toString());
  }
}
