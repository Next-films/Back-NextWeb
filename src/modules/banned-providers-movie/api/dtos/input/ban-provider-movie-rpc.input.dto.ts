import { TorApiProvidersEnum } from '@/common/types/types';

export class BanProviderMoviePayloadDto {
  provider: TorApiProvidersEnum;
  providerId: string;
  movieName: string | null;
}
