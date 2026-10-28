import { IsIn } from 'class-validator';

export class AdminShortContentFeedbackInputDto {
  @IsIn(['good', 'boring', 'unclear', 'cut-off'])
  rating: 'good' | 'boring' | 'unclear' | 'cut-off';
}
