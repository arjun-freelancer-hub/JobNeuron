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

  @Prop({ required: true })
  masterResumeUrl: string;

  @Prop({ type: [TailoredResume], default: [] })
  tailoredResumes: TailoredResume[];

  @Prop()
  originalFileName?: string;

  @Prop()
  fileSize?: number;

  @Prop()
  mimeType?: string;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);
