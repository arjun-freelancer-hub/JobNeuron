import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume, ResumeDocument } from '../schemas/resume.schema';
import { JobMatchScore, JobMatchScoreDocument } from '../schemas/job-match-score.schema';
import { R2Service } from '../storage/r2.service';
import { AIService } from '../ai/ai.service';
import * as mammoth from 'mammoth';
import * as crypto from 'crypto';
// Handle pdf-parse v2+ class-based API
const pdfParseModule = require('pdf-parse');
const PDFParse = pdfParseModule.PDFParse;

// Create a wrapper function for backward compatibility with v1 API
const pdfParse = async (buffer: Buffer): Promise<{ text: string }> => {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return { text: result.text };
};

@Injectable()
export class ResumesService {
  constructor(
    @InjectModel(Resume.name) private resumeModel: Model<ResumeDocument>,
    @InjectModel(JobMatchScore.name) private jobMatchScoreModel: Model<JobMatchScoreDocument>,
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
      
      // Invalidate all cached match scores for this user
      await this.jobMatchScoreModel.deleteMany({
        userId: new Types.ObjectId(userId),
      });
      
      return existingResume;
    } else {
      // Create new resume
      const resume = await this.resumeModel.create({
        userId: new Types.ObjectId(userId),
        masterResumeUrl: fileUrl,
        originalFileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        resumeSource: 'UPLOAD',
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
    if (!resume.masterResumeUrl) {
      throw new BadRequestException('Resume file not found. Please upload a resume file.');
    }
    const key = this.r2Service.extractKeyFromUrl(resume.masterResumeUrl);
    return this.r2Service.getFileUrl(key, 3600); // 1 hour expiry
  }

  async getTailoredResumeDownloadUrl(
    resumeId: string,
    jobId: string,
    userId: string,
  ): Promise<string> {
    const resume = await this.getResumeById(resumeId, userId);
    const tailoredResume = resume.tailoredResumes.find(
      (t) => t.jobId.toString() === jobId,
    );

    if (!tailoredResume) {
      throw new NotFoundException('Tailored resume not found');
    }

    const key = this.r2Service.extractKeyFromUrl(tailoredResume.resumeUrl);
    return this.r2Service.getFileUrl(key, 3600); // 1 hour expiry
  }

  async deleteResume(id: string, userId: string): Promise<void> {
    const resume = await this.getResumeById(id, userId);

    // Delete from R2 if master resume exists
    if (resume.masterResumeUrl) {
      const key = this.r2Service.extractKeyFromUrl(resume.masterResumeUrl);
      await this.r2Service.deleteFile(key);
    }

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
    if (!resume.masterResumeUrl) {
      throw new BadRequestException('Cannot tailor resume: No master resume file found. Please upload a resume file.');
    }
    
    const masterResumeText = await this.getResumeText(resume.masterResumeUrl);

    // Tailor resume using AI
    const tailoredText = await this.aiService.tailorResume(
      resume.masterResumeUrl,
      jobDescription,
      jobTitle,
      companyName,
      resume.mimeType,
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

  async getResumeTextFromResume(resume: ResumeDocument): Promise<string> {
    if (resume.resumeSource === 'FORM' && resume.formData) {
      // Convert form data to text format
      return this.formatFormDataAsText(resume.formData);
    }
    
    if (!resume.masterResumeUrl) {
      return '';
    }
    
    return this.getResumeText(resume.masterResumeUrl, resume.mimeType);
  }

  private formatFormDataAsText(formData: ResumeDocument['formData']): string {
    if (!formData) return '';
    
    let text = '';
    
    if (formData.name) text += `Name: ${formData.name}\n\n`;
    if (formData.email) text += `Email: ${formData.email}\n`;
    if (formData.phone) text += `Phone: ${formData.phone}\n\n`;
    if (formData.summary) text += `Summary:\n${formData.summary}\n\n`;
    
    if (formData.workExperience && formData.workExperience.length > 0) {
      text += 'Work Experience:\n';
      formData.workExperience.forEach((exp, idx) => {
        text += `${idx + 1}. ${exp.position} at ${exp.company}\n`;
        if (exp.startDate) text += `   Period: ${exp.startDate} - ${exp.endDate || 'Present'}\n`;
        if (exp.description) text += `   ${exp.description}\n`;
        text += '\n';
      });
    }
    
    if (formData.education && formData.education.length > 0) {
      text += 'Education:\n';
      formData.education.forEach((edu, idx) => {
        text += `${idx + 1}. ${edu.degree} in ${edu.field}\n`;
        text += `   ${edu.institution}\n`;
        if (edu.startDate) text += `   Period: ${edu.startDate} - ${edu.endDate || 'Present'}\n`;
        text += '\n';
      });
    }
    
    if (formData.skills && formData.skills.length > 0) {
      text += `Skills: ${formData.skills.join(', ')}\n`;
    }
    
    return text;
  }

  private async getResumeText(url: string, mimeType?: string): Promise<string> {
    try {
      // Extract key from URL
      const key = this.r2Service.extractKeyFromUrl(url);
      
      // Download file from R2
      const fileBuffer = await this.r2Service.downloadFile(key);
      
      // Parse based on file type
      if (mimeType === 'application/pdf') {
        const pdfData = await pdfParse(fileBuffer);
        return pdfData.text;
      } else if (
        mimeType === 'application/msword' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        return result.value;
      } else {
        // Try to detect type from file extension or default to PDF
        if (url.toLowerCase().endsWith('.pdf')) {
          const pdfData = await pdfParse(fileBuffer);
          return pdfData.text;
        } else if (url.toLowerCase().endsWith('.docx') || url.toLowerCase().endsWith('.doc')) {
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          return result.value;
        }
      }
      
      return '';
    } catch (error) {
      console.error('Error extracting resume text:', error);
      return '';
    }
  }

  async calculateResumeHash(userId: string): Promise<string> {
    const resumes = await this.getUserResumes(userId);
    if (resumes.length === 0) {
      return '';
    }

    const masterResume = resumes[0];
    const resumeText = await this.getResumeTextFromResume(masterResume);
    
    if (!resumeText || resumeText.trim().length === 0) {
      return '';
    }

    // Generate SHA-256 hash of resume text
    return crypto.createHash('sha256').update(resumeText).digest('hex');
  }

  async saveFormResume(userId: string, formData: ResumeDocument['formData']): Promise<ResumeDocument> {
    const existingResume = await this.resumeModel.findOne({ userId: new Types.ObjectId(userId) });

    if (existingResume) {
      existingResume.resumeSource = 'FORM';
      existingResume.formData = formData;
      await existingResume.save();
      
      // Invalidate all cached match scores for this user
      await this.jobMatchScoreModel.deleteMany({
        userId: new Types.ObjectId(userId),
      });
      
      return existingResume;
    } else {
      const resume = await this.resumeModel.create({
        userId: new Types.ObjectId(userId),
        resumeSource: 'FORM',
        formData: formData,
      });
      return resume;
    }
  }

  async getResumeSource(userId: string): Promise<'UPLOAD' | 'FORM' | null> {
    const resumes = await this.getUserResumes(userId);
    if (resumes.length === 0) {
      return null;
    }
    return resumes[0].resumeSource || 'UPLOAD';
  }

  async updateResumeSource(userId: string, source: 'UPLOAD' | 'FORM'): Promise<ResumeDocument> {
    const existingResume = await this.resumeModel.findOne({ userId: new Types.ObjectId(userId) });
    
    if (!existingResume) {
      throw new NotFoundException('Resume not found');
    }
    
    existingResume.resumeSource = source;
    await existingResume.save();
    
    // Invalidate all cached match scores for this user
    await this.jobMatchScoreModel.deleteMany({
      userId: new Types.ObjectId(userId),
    });
    
    return existingResume;
  }
}
