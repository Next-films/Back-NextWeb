import { Repository } from 'typeorm';
import { PlaybackSettings } from '@/playback-settings/domain/playback-settings.entity';
import { PlaybackSettingsRepository } from '@/playback-settings/infrastructure/playback-settings.repository';

describe('PlaybackSettingsRepository', () => {
  it('loads the first settings row without using findOne without conditions', async () => {
    const existing = PlaybackSettings.createDefault();
    const find = jest.fn().mockResolvedValue([existing]);
    const save = jest.fn();
    const typeormRepository = {
      find,
      save,
    } as unknown as Repository<PlaybackSettings>;
    const repository = new PlaybackSettingsRepository(typeormRepository);

    await expect(repository.getOrCreateDefault()).resolves.toBe(existing);
    expect(find).toHaveBeenCalledWith({
      order: { id: 'ASC' },
      take: 1,
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('creates defaults when the table has no settings row', async () => {
    const find = jest.fn().mockResolvedValue([]);
    const save = jest.fn().mockImplementation(value => Promise.resolve(value));
    const typeormRepository = {
      find,
      save,
    } as unknown as Repository<PlaybackSettings>;
    const repository = new PlaybackSettingsRepository(typeormRepository);

    const settings = await repository.getOrCreateDefault();

    expect(settings.provider).toBe('vibix');
    expect(save).toHaveBeenCalledTimes(1);
  });
});
