import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ApplicationStatus } from '../schemas/application.schema';
import type { UserDocument } from '../schemas/user.schema';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post('apply')
  async createApplication(
    @Body() body: {
      jobId: string;
      resumeId: string;
      jobUrl: string;
      platform: string;
      email?: string;
      phone?: string;
    },
    @GetUser() user: UserDocument,
  ) {
    return this.applicationsService.createApplication(
      user._id.toString(),
      body.jobId,
      body.resumeId,
      body.jobUrl,
      body.platform,
      body.email,
      body.phone,
    );
  }

  @Get()
  async getUserApplications(@GetUser() user: UserDocument) {
    return this.applicationsService.getUserApplications(user._id.toString());
  }

  @Get('stats')
  async getApplicationStats(@GetUser() user: UserDocument) {
    return this.applicationsService.getApplicationStats(user._id.toString());
  }

  @Get(':id')
  async getApplicationById(
    @Param('id') id: string,
    @GetUser() user: UserDocument,
  ) {
    return this.applicationsService.getApplicationById(id, user._id.toString());
  }

  @Patch(':id/status')
  async updateApplicationStatus(
    @Param('id') id: string,
    @Body() body: { status: ApplicationStatus; errorMessage?: string },
  ) {
    return this.applicationsService.updateApplicationStatus(
      id,
      body.status,
      body.errorMessage,
    );
  }
}
