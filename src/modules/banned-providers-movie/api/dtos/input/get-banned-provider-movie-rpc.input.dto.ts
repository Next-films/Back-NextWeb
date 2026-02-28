import { TorApiProvidersEnum } from '@/common/types/types';

export class GetBannedMovieByProviderPayloadDto {
  provider: TorApiProvidersEnum;
  providerId: string;
}
