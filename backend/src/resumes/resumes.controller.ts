import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResumesService } from './resumes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { UserDocument } from '../schemas/user.schema';

@Controller('resumes')
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
      }),
    )
    file: Express.Multer.File,
    @GetUser() user: UserDocument,
  ) {
    return this.resumesService.uploadResume(user._id.toString(), file);
  }

  @Get()
  async getUserResumes(@GetUser() user: UserDocument) {
    return this.resumesService.getUserResumes(user._id.toString());
  }

  @Get('config')
  async getResumeConfig(@GetUser() user: UserDocument) {
    const source = await this.resumesService.getResumeSource(user._id.toString());
    return { resumeSource: source || 'UPLOAD' };
  }

  @Get(':id')
  async getResumeById(@Param('id') id: string, @GetUser() user: UserDocument) {
    return this.resumesService.getResumeById(id, user._id.toString());
  }

  @Get(':id/download')
  async getResumeDownloadUrl(@Param('id') id: string, @GetUser() user: UserDocument) {
    const url = await this.resumesService.getResumeDownloadUrl(id, user._id.toString());
    return { url };
  }

  @Get(':id/tailored/:jobId/download')
  async getTailoredResumeDownloadUrl(
    @Param('id') id: string,
    @Param('jobId') jobId: string,
    @GetUser() user: UserDocument,
  ) {
    const url = await this.resumesService.getTailoredResumeDownloadUrl(
      id,
      jobId,
      user._id.toString(),
    );
    return { url };
  }

  @Delete(':id')
  async deleteResume(@Param('id') id: string, @GetUser() user: UserDocument) {
    await this.resumesService.deleteResume(id, user._id.toString());
    return { message: 'Resume deleted successfully' };
  }

  @Post(':id/tailor')
  async tailorResume(
    @Param('id') id: string,
    @Body() body: { jobId: string; jobDescription: string; jobTitle: string; companyName: string },
    @GetUser() user: UserDocument,
  ) {
    return this.resumesService.tailorResumeForJob(
      id,
      user._id.toString(),
      body.jobId,
      body.jobDescription,
      body.jobTitle,
      body.companyName,
    );
  }

  @Post('form')
  async saveFormResume(
    @Body() body: {
      name?: string;
      email?: string;
      phone?: string;
      summary?: string;
      workExperience?: Array<{
        company: string;
        position: string;
        startDate: string;
        endDate?: string;
        description: string;
      }>;
      education?: Array<{
        institution: string;
        degree: string;
        field: string;
        startDate: string;
        endDate?: string;
      }>;
      skills?: string[];
    },
    @GetUser() user: UserDocument,
  ) {
    return this.resumesService.saveFormResume(user._id.toString(), body);
  }

  @Post('config')
  async updateResumeConfig(
    @Body() body: { resumeSource: 'UPLOAD' | 'FORM' },
    @GetUser() user: UserDocument,
  ) {
    return this.resumesService.updateResumeSource(user._id.toString(), body.resumeSource);
  }
}
