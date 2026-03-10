import {
  DownloaderTransportModeEnum,
  DownloaderTransportModeService,
} from '@/common/services/downloader-transport-mode.service';

describe('DownloaderTransportModeService', () => {
  const createService = (isRmqEnabled: boolean) => {
    const configService = {
      get: jest.fn().mockReturnValue({
        IS_RMQ_ENABLE: isRmqEnabled,
      }),
    } as any;

    return new DownloaderTransportModeService(configService);
  };

  it('should initialize with RMQ mode when RMQ is enabled', () => {
    const service = createService(true);

    expect(service.getState()).toEqual({
      mode: DownloaderTransportModeEnum.RMQ,
      isRmqAvailable: true,
      hasRmqErrors: false,
    });
  });

  it('should mark RMQ failure, switch to HTTP and set rmq error flag', () => {
    const service = createService(true);

    service.markRmqFailureAndFallbackToHttp();

    expect(service.getState()).toEqual({
      mode: DownloaderTransportModeEnum.HTTP,
      isRmqAvailable: true,
      hasRmqErrors: true,
    });
  });

  it('should clear RMQ error flag on RMQ success', () => {
    const service = createService(true);
    service.markRmqFailureAndFallbackToHttp();

    service.markRmqSuccess();

    expect(service.getState().hasRmqErrors).toBe(false);
  });

  it('should throw when trying to set RMQ mode while RMQ is unavailable', () => {
    const service = createService(false);

    expect(() => service.setMode(DownloaderTransportModeEnum.RMQ)).toThrow(
      'RMQ mode is unavailable for current environment.',
    );
  });
});
