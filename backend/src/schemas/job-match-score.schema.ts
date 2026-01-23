import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobMatchScoreDocument = JobMatchScore & Document;

@Schema({ timestamps: true })
export class JobMatchScore {
  @Prop({ type: Types.ObjectId, ref: 'Job', required: true, index: true })
  jobId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Number, min: 0, max: 10, required: true })
  score: number;

  @Prop({ type: String, required: true })
  resumeHash: string;

  @Prop({ default: Date.now })
  calculatedAt: Date;
}

export const JobMatchScoreSchema = SchemaFactory.createForClass(JobMatchScore);

// Create compound index for fast lookups
JobMatchScoreSchema.index({ jobId: 1, userId: 1 }, { unique: true });
