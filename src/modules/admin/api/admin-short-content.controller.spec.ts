import { AdminShortContentController } from './admin-short-content.controller';
import { ShortContentJob, ShortContentType } from '@/admin/domain/short-content-job.entity';

describe('AdminShortContentController rebuild refresh', () => {
  it('refreshes completed rebuilt jobs once and then retains the fresh cached payload', async () => {
    const job = ShortContentJob.create(ShortContentType.FILM, 1, {});
    job.markStarted({
      jobId: 'engine-job',
      status: 'done',
      updatedAt: '2026-10-27T01:00:00.000Z',
      clips: [{ index: 1, processingVersion: 2, revision: 3 }],
    });
    const client = {
      getReprocessing: jest.fn().mockResolvedValue({
        status: 'completed',
        updatedJobs: { 'engine-job': '2026-10-27T02:00:00.000Z' },
      }),
      getHighlights: jest.fn().mockResolvedValue({
        jobId: 'engine-job',
        status: 'done',
        updatedAt: '2026-10-27T02:00:00.000Z',
        clips: [{ index: 1, processingVersion: 2, revision: 4 }],
      }),
    };
    const repo = {
      findAll: jest.fn().mockResolvedValue([job]),
      save: jest.fn().mockImplementation((value: ShortContentJob) => Promise.resolve(value)),
    };
    const logger = { setContext: jest.fn(), log: jest.fn(), warn: jest.fn() };
    const controller = new AdminShortContentController(
      logger as never,
      client as never,
      repo as never,
    );
    const first = await controller.getAll({} as never);
    expect((first[0].result?.clips as Array<{ revision: number }>)[0].revision).toBe(4);
    await controller.getAll({} as never);
    expect(client.getHighlights).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });
});
