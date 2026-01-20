import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { R2Service } from '../storage/r2.service';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

@Injectable()
export class AIService {
  private openai: OpenAI;

  constructor(private r2Service: R2Service) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async tailorResume(
    masterResumeUrl: string,
    jobDescription: string,
    jobTitle: string,
    companyName: string,
  ): Promise<string> {
    // Download and parse master resume
    const resumeText = await this.getResumeTextFromUrl(masterResumeUrl);

    // Create prompt for OpenAI
    const prompt = `You are an expert resume writer. Your task is to tailor a resume to match a specific job description.

Original Resume:
${resumeText}

Job Title: ${jobTitle}
Company: ${companyName}

Job Description:
${jobDescription}

Instructions:
1. Analyze the job description and identify key skills, qualifications, and requirements
2. Modify the resume to highlight relevant experience, skills, and achievements that match the job
3. Reorder sections if needed to emphasize the most relevant qualifications
4. Use keywords from the job description naturally throughout the resume
5. Maintain the original format and structure as much as possible
6. Keep all factual information accurate - only rephrase and reorder, don't invent experience
7. Ensure the resume is professional and ATS-friendly

Return the tailored resume in the same format as the original (text format).`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume writer specializing in tailoring resumes to match job descriptions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const tailoredResumeText = completion.choices[0]?.message?.content || '';

      // For now, return text. In production, you'd convert this back to PDF/DOCX
      // and upload to R2
      return tailoredResumeText;
    } catch (error) {
      console.error('Error tailoring resume:', error);
      throw new Error('Failed to tailor resume');
    }
  }

  async matchJob(
    resumeText: string,
    jobDescription: string,
    jobTitle: string,
  ): Promise<number> {
    const prompt = `Analyze how well a resume matches a job description and provide a score from 0 to 10.

Resume:
${resumeText}

Job Title: ${jobTitle}

Job Description:
${jobDescription}

Provide a match score from 0 to 10 where:
- 0-3: Poor match - few relevant skills or experience
- 4-6: Moderate match - some relevant skills but missing key requirements
- 7-8: Good match - most requirements met, strong candidate
- 9-10: Excellent match - all or nearly all requirements met, ideal candidate

Respond with ONLY a number between 0 and 10, no explanation.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert recruiter analyzing resume-job matches. Respond with only a number.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 10,
      });

      const scoreText = completion.choices[0]?.message?.content?.trim() || '0';
      const score = parseFloat(scoreText);

      // Ensure score is between 0 and 10
      return Math.max(0, Math.min(10, isNaN(score) ? 0 : score));
    } catch (error) {
      console.error('Error matching job:', error);
      return 0;
    }
  }

  private async getResumeTextFromUrl(url: string): Promise<string> {
    // This is a placeholder - in production, you'd download from R2
    // For now, we'll assume the resume text is already available
    // In a real implementation, you'd:
    // 1. Download file from R2
    // 2. Parse based on file type
    // 3. Return text
    return '';
  }
}
