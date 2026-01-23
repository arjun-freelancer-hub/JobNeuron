import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  Logger,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ApplicationStatus } from '../schemas/application.schema';
import type { UserDocument } from '../schemas/user.schema';

@Controller('applications')
export class ApplicationsController {
  private readonly logger = new Logger(ApplicationsController.name);

  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post('apply')
  @UseGuards(JwtAuthGuard)
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
    this.logger.log(`[Applications] POST /apply - userId=${user._id}`);
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
  @UseGuards(JwtAuthGuard)
  async getUserApplications(@GetUser() user: UserDocument) {
    return this.applicationsService.getUserApplications(user._id.toString());
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getApplicationStats(@GetUser() user: UserDocument) {
    return this.applicationsService.getApplicationStats(user._id.toString());
  }

  @Get('job/:jobId')
  @UseGuards(JwtAuthGuard)
  async getApplicationByJobId(
    @Param('jobId') jobId: string,
    @GetUser() user: UserDocument,
  ) {
    const application = await this.applicationsService.getApplicationByJobId(
      user._id.toString(),
      jobId,
    );
    return application || null;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getApplicationById(
    @Param('id') id: string,
    @GetUser() user: UserDocument,
  ) {
    return this.applicationsService.getApplicationById(id, user._id.toString());
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
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

  @Post(':id/complete')
  async completeApplication(
    @Param('id') id: string,
    @Body() body: { 
      status: 'SUCCESS' | 'FAILED';
      errorMessage?: string;
      appliedAt?: Date;
      [key: string]: any; // Allow additional fields from worker
    },
  ) {
    this.logger.log(`[Applications] POST /${id}/complete - status=${body.status}`);
    const applicationStatus = body.status === 'SUCCESS' 
      ? ApplicationStatus.SUCCESS 
      : ApplicationStatus.FAILED;
    
    return this.applicationsService.updateApplicationStatus(
      id,
      applicationStatus,
      body.errorMessage,
    );
  }
}
