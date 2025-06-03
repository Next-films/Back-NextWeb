import { IsOptional, IsString, IsUrl, IsDateString } from 'class-validator';

export class UpdateEpisodeDto {
    @IsOptional() @IsString() title?: string;
    @IsOptional() @IsString() originalTitle?: string;
    @IsOptional() @IsString() description?: string;
    @IsOptional() @IsUrl() previewUrl?: string;
    @IsOptional() @IsDateString() releaseDate?: string;
}
