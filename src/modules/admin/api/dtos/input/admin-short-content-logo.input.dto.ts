import { IsBoolean, IsNumber, Max, Min } from 'class-validator';

export class AdminShortContentLogoInputDto {
  @IsBoolean()
  enabled: boolean;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(5)
  @Max(75)
  widthPercent: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  xPercent: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  yPercent: number;
}
