import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { CATEGORIES, PRIORITIES, STATUSES } from './domain';
const Trim = () => Transform(({ value }) => typeof value === 'string' ? value.trim() : value);
export class RequestDto {
  @Trim() @IsString() @Length(3, 120) title!: string;
  @Trim() @IsString() @Length(10, 5000) description!: string;
  @Trim() @IsString() @Length(2, 100) requester!: string;
  @IsIn(CATEGORIES) category!: string;
  @IsIn(PRIORITIES) priority!: string;
}
export class UpdateRequestDto extends RequestDto {
  @Trim() @IsString() @Length(2, 100) actor!: string;
}
export class StatusDto {
  @IsIn(STATUSES) status!: typeof STATUSES[number];
  @Trim() @IsString() @Length(2, 100) actor!: string;
  @IsOptional() @Trim() @IsString() @Length(0, 2000) observation?: string;
}
export class ListDto {
  @IsOptional() @Trim() @IsString() @Length(0, 120) q?: string;
  @IsOptional() @IsIn(STATUSES) status?: string;
  @IsOptional() @IsIn(CATEGORIES) category?: string;
  @IsOptional() @IsIn(PRIORITIES) priority?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 8;
  @IsIn(['created_at', 'updated_at', 'title', 'priority']) sort = 'created_at';
  @IsIn(['asc', 'desc']) order = 'desc';
}
