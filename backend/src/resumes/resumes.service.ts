import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume, ResumeDocument } from '../schemas/resume.schema';
import { R2Service } from '../storage/r2.service';
import { AIService } from '../ai/ai.service';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

@Injectable()
export class ResumesService {
  constructor(
    @InjectModel(Resume.name) private resumeModel: Model<ResumeDocument>,
    private r2Service: R2Service,
    private aiService: AIService,
  ) {}

  async uploadResume(
    userId: string,
    file: Express.Multer.File,
  ): Promise<ResumeDocument> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only PDF and DOCX files are allowed');
    }

    // Upload to R2
    const fileUrl = await this.r2Service.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    // Parse resume content
    let resumeText = '';
    try {
      if (file.mimetype === 'application/pdf') {
        const pdfData = await pdfParse(file.buffer);
        resumeText = pdfData.text;
      } else if (
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        resumeText = result.value;
      }
    } catch (error) {
      // If parsing fails, continue without text
      console.error('Error parsing resume:', error);
    }

    // Check if user already has a resume
    const existingResume = await this.resumeModel.findOne({ userId: new Types.ObjectId(userId) });

    if (existingResume) {
      // Update existing resume
      existingResume.masterResumeUrl = fileUrl;
      existingResume.originalFileName = file.originalname;
      existingResume.fileSize = file.size;
      existingResume.mimeType = file.mimetype;
      await existingResume.save();
      return existingResume;
    } else {
      // Create new resume
      const resume = await this.resumeModel.create({
        userId: new Types.ObjectId(userId),
        masterResumeUrl: fileUrl,
        originalFileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      });
      return resume;
    }
  }

  async getUserResumes(userId: string): Promise<ResumeDocument[]> {
    return this.resumeModel.find({ userId: new Types.ObjectId(userId) }).exec();
  }

  async getResumeById(id: string, userId: string): Promise<ResumeDocument> {
    const resume = await this.resumeModel.findOne({
      _id: id,
      userId: new Types.ObjectId(userId),
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume;
  }

  async getResumeDownloadUrl(id: string, userId: string): Promise<string> {
    const resume = await this.getResumeById(id, userId);
    const key = this.r2Service.extractKeyFromUrl(resume.masterResumeUrl);
    return this.r2Service.getFileUrl(key, 3600); // 1 hour expiry
  }

  async deleteResume(id: string, userId: string): Promise<void> {
    const resume = await this.getResumeById(id, userId);

    // Delete from R2
    const key = this.r2Service.extractKeyFromUrl(resume.masterResumeUrl);
    await this.r2Service.deleteFile(key);

    // Delete tailored resumes from R2
    for (const tailored of resume.tailoredResumes) {
      const tailoredKey = this.r2Service.extractKeyFromUrl(tailored.resumeUrl);
      await this.r2Service.deleteFile(tailoredKey);
    }

    // Delete from database
    await this.resumeModel.findByIdAndDelete(id);
  }

  async tailorResumeForJob(
    resumeId: string,
    userId: string,
    jobId: string,
    jobDescription: string,
    jobTitle: string,
    companyName: string,
  ): Promise<ResumeDocument> {
    const resume = await this.getResumeById(resumeId, userId);

    // Check if already tailored for this job
    const existingTailored = resume.tailoredResumes.find(
      (t) => t.jobId.toString() === jobId,
    );

    if (existingTailored) {
      return resume;
    }

    // Get master resume text
    const masterResumeText = await this.getResumeText(resume.masterResumeUrl);

    // Tailor resume using AI
    const tailoredText = await this.aiService.tailorResume(
      resume.masterResumeUrl,
      jobDescription,
      jobTitle,
      companyName,
    );

    // Convert tailored text to file and upload to R2
    // For now, we'll store the text. In production, convert to PDF/DOCX
    const tailoredFileName = `tailored-${jobId}-${Date.now()}.txt`;
    const tailoredBuffer = Buffer.from(tailoredText, 'utf-8');
    const tailoredUrl = await this.r2Service.uploadFile(
      tailoredBuffer,
      tailoredFileName,
      'text/plain',
    );

    // Add tailored resume to the resume document
    resume.tailoredResumes.push({
      jobId: new Types.ObjectId(jobId),
      resumeUrl: tailoredUrl,
      version: 1,
      createdAt: new Date(),
    });

    await resume.save();
    return resume;
  }

  private async getResumeText(url: string): Promise<string> {
    // Placeholder - in production, download from R2 and parse
    return '';
  }
}
