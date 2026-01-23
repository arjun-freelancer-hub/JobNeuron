import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { JobPlatform } from './job.schema';

export type AutomationScheduleDocument = AutomationSchedule & Document;

@Schema({ timestamps: true })
export class AutomationSchedule {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, default: '0 9 * * *' }) // Daily at 9 AM
  cronExpression: string;

  @Prop({ required: true, default: 10, min: 1, max: 100 })
  maxJobsPerDay: number;

  @Prop({ type: [String], enum: JobPlatform, default: [JobPlatform.LINKEDIN, JobPlatform.INDEED] })
  platforms: JobPlatform[];

  @Prop({ default: false })
  isActive: boolean;
}

export const AutomationScheduleSchema = SchemaFactory.createForClass(AutomationSchedule);
