import { DownloaderServiceSwitchAdapter } from '@/common/infrastructure/downloader/downloader-service-switch.adapter';
import { AppNotificationResultEnum } from '@/common/utils/app-notification.util';

describe('DownloaderServiceSwitchAdapter', () => {
  const createAdapter = (opts?: {
    isRmqMode?: boolean;
    rmqClearLogsResult?: any;
    rmqBridgeFindFilmsError?: Error;
  }) => {
    const rmqAdapter = {
      bridgeFindFilms: jest.fn(),
      clearLogs: jest.fn(),
    };

    const restAdapter = {
      bridgeFindFilms: jest.fn().mockResolvedValue(undefined),
      clearLogs: jest.fn().mockResolvedValue({
        appResult: AppNotificationResultEnum.Success,
        data: null,
        errorField: null,
      }),
    };

    const modeService = {
      isRmqMode: jest.fn().mockReturnValue(opts?.isRmqMode ?? true),
      markRmqSuccess: jest.fn(),
      markRmqFailureAndFallbackToHttp: jest.fn(),
    };

    const logger = {
      setContext: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    if (opts?.rmqBridgeFindFilmsError) {
      rmqAdapter.bridgeFindFilms.mockRejectedValue(opts.rmqBridgeFindFilmsError);
    } else {
      rmqAdapter.bridgeFindFilms.mockResolvedValue(undefined);
    }

    rmqAdapter.clearLogs.mockResolvedValue(
      opts?.rmqClearLogsResult ?? {
        appResult: AppNotificationResultEnum.Success,
        data: null,
        errorField: null,
      },
    );

    const adapter = new DownloaderServiceSwitchAdapter(
      rmqAdapter as any,
      restAdapter as any,
      modeService as any,
      logger as any,
    );

    return { adapter, rmqAdapter, restAdapter, modeService, logger };
  };

  it('should fallback to HTTP for bridge call when RMQ throws', async () => {
    const { adapter, rmqAdapter, restAdapter, modeService } = createAdapter({
      isRmqMode: true,
      rmqBridgeFindFilmsError: new Error('RMQ unavailable'),
    });

    await adapter.bridgeFindFilms();

    expect(rmqAdapter.bridgeFindFilms).toHaveBeenCalledTimes(1);
    expect(modeService.markRmqFailureAndFallbackToHttp).toHaveBeenCalledTimes(1);
    expect(restAdapter.bridgeFindFilms).toHaveBeenCalledTimes(1);
  });

  it('should fallback to HTTP for request call when RMQ returns InternalError', async () => {
    const { adapter, rmqAdapter, restAdapter, modeService } = createAdapter({
      isRmqMode: true,
      rmqClearLogsResult: {
        appResult: AppNotificationResultEnum.InternalError,
        data: null,
        errorField: null,
      },
    });

    await adapter.clearLogs(['ffmpeg']);

    expect(rmqAdapter.clearLogs).toHaveBeenCalledTimes(1);
    expect(modeService.markRmqFailureAndFallbackToHttp).toHaveBeenCalledTimes(1);
    expect(restAdapter.clearLogs).toHaveBeenCalledTimes(1);
  });

  it('should keep RMQ mode on successful RMQ request', async () => {
    const { adapter, rmqAdapter, restAdapter, modeService } = createAdapter({
      isRmqMode: true,
    });

    await adapter.clearLogs(['ffmpeg']);

    expect(rmqAdapter.clearLogs).toHaveBeenCalledTimes(1);
    expect(modeService.markRmqSuccess).toHaveBeenCalledTimes(1);
    expect(modeService.markRmqFailureAndFallbackToHttp).not.toHaveBeenCalled();
    expect(restAdapter.clearLogs).not.toHaveBeenCalled();
  });
});
