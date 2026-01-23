import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ResumeDocument = Resume & Document;

@Schema({ _id: false })
export class TailoredResume {
  @Prop({ type: Types.ObjectId, ref: 'Job' })
  jobId: Types.ObjectId;

  @Prop({ required: true })
  resumeUrl: string;

  @Prop({ default: 1 })
  version: number;

  @Prop({ default: Date.now })
  createdAt: Date;
}

@Schema({ timestamps: true })
export class Resume {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: false })
  masterResumeUrl?: string;

  @Prop({ type: [TailoredResume], default: [] })
  tailoredResumes: TailoredResume[];

  @Prop()
  originalFileName?: string;

  @Prop()
  fileSize?: number;

  @Prop()
  mimeType?: string;

  @Prop({ enum: ['UPLOAD', 'FORM'], default: 'UPLOAD' })
  resumeSource: 'UPLOAD' | 'FORM';

  @Prop({ type: Object })
  formData?: {
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
  };
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);
