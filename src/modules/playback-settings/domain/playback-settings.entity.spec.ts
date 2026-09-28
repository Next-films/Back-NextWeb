import { PlaybackProvider } from '@/playback-settings/domain/playback-provider.enum';
import { PlaybackSettings } from '@/playback-settings/domain/playback-settings.entity';

describe('PlaybackSettings', () => {
  it('uses Vibix by default and can switch to legacy', () => {
    const settings = PlaybackSettings.createDefault();

    expect(settings.provider).toBe(PlaybackProvider.VIBIX);

    settings.update(PlaybackProvider.LEGACY);

    expect(settings.provider).toBe(PlaybackProvider.LEGACY);
  });
});
