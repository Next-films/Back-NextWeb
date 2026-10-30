import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  ValidateIf,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShortContentType } from '@/admin/domain/short-content-job.entity';
import { SocialPublishingProvider } from '@/admin/domain/social-publishing-rule.entity';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import type {
  PublishingGroup,
  PublishingStrategy,
} from '@/admin/application/services/social-publishing-groups';

export class AdminCreateSocialPublishingRuleInputDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsIn(['own', 'youtube'], { each: true })
  sourceGroups?: PublishingGroup[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['alternate', 'ratio', 'own_first', 'youtube_first'])
  groupStrategy?: PublishingStrategy;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['own', 'youtube'])
  firstGroup?: PublishingGroup;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(20)
  ownPerCycle?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(20)
  youtubePerCycle?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  fallbackToOtherGroup?: boolean;

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

  @ApiPropertyOptional({
    type: [String],
    example: ['11:00', '12:00', '15:00'],
    description: 'Fixed daily publication times in the rule timezone',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(48)
  @ArrayUnique()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { each: true })
  dailyTimes?: string[] | null;

  @ApiProperty({ example: '2026-10-10T12:00:00+03:00' })
  @IsDateString()
  startAt: string;

  @ApiPropertyOptional({
    nullable: true,
    example: '2026-12-31T23:59:00+03:00',
    description: 'Do not create publications scheduled after this date',
  })
  @IsOptional()
  @IsDateString()
  endAt?: string | null;

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
  { skipNullProperties: false },
) {}
