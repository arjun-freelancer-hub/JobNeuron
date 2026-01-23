import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type JobDocument = Job & Document;

export enum JobPlatform {
  LINKEDIN = 'LINKEDIN',
  INDEED = 'INDEED',
  WELLFOUND = 'WELLFOUND',
  COMPANY = 'COMPANY',
}

@Schema({ timestamps: true })
export class Job {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  company: string;

  @Prop({ type: String, enum: JobPlatform, required: true })
  platform: JobPlatform;

  @Prop({ required: true, unique: true, index: true })
  url: string;

  @Prop({ required: true, type: String })
  description: string;

  @Prop()
  location?: string;

  @Prop()
  salary?: string;

  @Prop({ default: Date.now })
  discoveredAt: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);
