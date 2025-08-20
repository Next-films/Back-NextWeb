import { FindTorApiTorrentFilmType } from '@/common/types/types';
import { Admin } from '@/admin/domain/admin.entity';

export class CreateModerationDto {
  movieId: number;
  admin?: Admin | null;
  torrentMetaData?: FindTorApiTorrentFilmType | null;
}
