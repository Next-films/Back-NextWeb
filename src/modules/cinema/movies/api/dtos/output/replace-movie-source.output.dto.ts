import { ApiProperty } from '@nestjs/swagger';

export class ReplaceMovieSourceOutputDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Ссылка на плейлист, которая была активна до замены. null означает, что запрос был повторным ' +
      '(источник уже равен переданному key): менять было нечего и удалять из хранилища ничего нельзя.',
  })
  previousVideoUrl: string | null;
}
