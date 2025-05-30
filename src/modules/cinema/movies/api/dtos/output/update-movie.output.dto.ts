import {
    IsOptional,
    IsString,
    IsUrl,
    IsArray,
    IsNumber,
    IsDateString,
} from 'class-validator';

export class UpdateMovieDto {
    @IsOptional() @IsString() title?: string;
    @IsOptional() @IsString() originalTitle?: string;
    @IsOptional() @IsString() alternativeTitles?: string;
    @IsOptional() @IsString() description?: string;
    @IsOptional() @IsString() videoUrl?: string;
    @IsOptional() @IsUrl() trailerUrl?: string;
    @IsOptional() @IsUrl() titleImg?: string;
    @IsOptional() @IsUrl() cardImg?: string;
    @IsOptional() @IsUrl() backgroundImg?: string;
    @IsOptional() @IsNumber() duration?: number;
    @IsOptional() @IsArray() @IsString({ each: true }) country?: string[];
    @IsOptional() @IsDateString() releaseDate?: string;
    @IsOptional() @IsArray() @IsNumber({}, { each: true }) genres?: number[];
}
