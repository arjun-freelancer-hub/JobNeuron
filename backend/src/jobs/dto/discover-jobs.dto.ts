import { IsEnum, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { JobPlatform } from '../../schemas/job.schema';

export class DiscoverJobsDto {
  @IsEnum(JobPlatform)
  platform: JobPlatform;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}
