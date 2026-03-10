import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';

export enum DownloaderTransportModeEnum {
  RMQ = 'rmq',
  HTTP = 'http',
}

@Injectable()
export class DownloaderTransportModeService {
  private mode: DownloaderTransportModeEnum;
  private readonly isRmqAvailable: boolean;
  private hasRmqErrors = false;

  constructor(private readonly configService: ConfigService<ConfigurationType, true>) {
    const businessRulesSettings = this.configService.get('businessRulesSettings', { infer: true });
    this.isRmqAvailable = businessRulesSettings.IS_RMQ_ENABLE;
    this.mode = this.isRmqAvailable
      ? DownloaderTransportModeEnum.RMQ
      : DownloaderTransportModeEnum.HTTP;
  }

  getMode(): DownloaderTransportModeEnum {
    return this.mode;
  }

  getState(): {
    mode: DownloaderTransportModeEnum;
    isRmqAvailable: boolean;
    hasRmqErrors: boolean;
  } {
    return {
      mode: this.mode,
      isRmqAvailable: this.isRmqAvailable,
      hasRmqErrors: this.hasRmqErrors,
    };
  }

  setMode(mode: DownloaderTransportModeEnum): void {
    if (mode === DownloaderTransportModeEnum.RMQ && !this.isRmqAvailable) {
      throw new Error('RMQ mode is unavailable for current environment.');
    }

    this.mode = mode;
  }

  isRmqMode(): boolean {
    return this.mode === DownloaderTransportModeEnum.RMQ;
  }

  markRmqFailureAndFallbackToHttp(): void {
    this.hasRmqErrors = true;
    this.mode = DownloaderTransportModeEnum.HTTP;
  }

  markRmqSuccess(): void {
    this.hasRmqErrors = false;
  }
}
