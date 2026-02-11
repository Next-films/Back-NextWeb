import { ApiProperty } from '@nestjs/swagger';
import { Injectable } from '@nestjs/common';
import { ExternalApiConfigEntity } from '@/external-api-config/domain/external-api-config.entity';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';

export class AdminExternalApiConfigOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: ExternalApiProviderEnum })
  provider: ExternalApiProviderEnum;

  @ApiProperty({ enum: ExternalApiTargetEnum })
  target: ExternalApiTargetEnum;

  @ApiProperty()
  baseUrl: string;

  @ApiProperty({ nullable: true })
  token: string | null;

  @ApiProperty()
  isEnabled: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

@Injectable()
export class AdminExternalApiConfigOutputDtoMapper {
  mapConfig(config: ExternalApiConfigEntity): AdminExternalApiConfigOutputDto {
    return {
      id: config.id,
      provider: config.provider,
      target: config.target,
      baseUrl: config.baseUrl,
      token: config.token,
      isEnabled: config.isEnabled,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  mapConfigs(configs: ExternalApiConfigEntity[]): AdminExternalApiConfigOutputDto[] {
    return configs.map(c => this.mapConfig(c));
  }
}
