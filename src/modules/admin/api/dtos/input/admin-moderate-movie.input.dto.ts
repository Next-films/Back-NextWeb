import { FindTorApiTorrentFilmType, MovieTypesEnum } from '@/common/types/types';

export class ModerateRequestPayloadDto {
  type: MovieTypesEnum;
  kpId: string;
  movieName: string;
  torrent: FindTorApiTorrentFilmType;
}
