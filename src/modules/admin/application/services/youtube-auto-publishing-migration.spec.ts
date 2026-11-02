import { AddYoutubeAutoEnrollment1793638800000 } from '../../../../migrations/migrations/1793638800000-add-youtube-auto-enrollment';

it('keeps all existing rules manual and preserves enrollment history on rollback', async () => {
  const runner = { query: jest.fn().mockResolvedValue([]) };
  const migration = new AddYoutubeAutoEnrollment1793638800000();
  await migration.up(runner as never);
  expect(runner.query.mock.calls[0][0]).toContain('DEFAULT false');
  expect(runner.query.mock.calls[1][0]).toContain("DEFAULT 'manual'");
  expect(runner.query.mock.calls.every(([sql]) => !sql.includes('UPDATE '))).toBe(true);
  runner.query.mockResolvedValue([{ exists: 1 }]);
  await expect(migration.down(runner as never)).rejects.toThrow('history');
  expect(runner.query).toHaveBeenCalledTimes(3);
});
