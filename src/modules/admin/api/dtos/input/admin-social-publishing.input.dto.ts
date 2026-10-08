import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShortContentType } from '@/admin/domain/short-content-job.entity';
import { SocialPublishingProvider } from '@/admin/domain/social-publishing-rule.entity';
import { Trim } from '@/common/decorators/transform/trim.decorator';

export class AdminCreateSocialPublishingRuleInputDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ enum: SocialPublishingProvider })
  @IsEnum(SocialPublishingProvider)
  provider: SocialPublishingProvider;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  projectId: number;

  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  accountIds: number[];

  @ApiPropertyOptional({ enum: ShortContentType, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ShortContentType, { each: true })
  contentTypes?: ShortContentType[];

  @ApiProperty({ description: 'Interval between publications, in minutes' })
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(525_600)
  intervalMinutes: number;

  @ApiProperty({ example: '2026-10-10T12:00:00+03:00' })
  @IsDateString()
  startAt: string;

  @ApiPropertyOptional({ default: 'Europe/Moscow' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  titleTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  captionTemplate?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class AdminUpdateSocialPublishingRuleInputDto extends PartialType(
  AdminCreateSocialPublishingRuleInputDto,
) {}
