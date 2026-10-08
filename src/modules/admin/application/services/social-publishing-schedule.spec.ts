import {
  getFirstDailyRunAt,
  getNextDailyRunAt,
  normalizeDailyTimes,
} from '@/admin/application/services/social-publishing-schedule';

describe('social publishing schedule', () => {
  it('normalizes and sorts duplicate daily times', () => {
    expect(normalizeDailyTimes(['15:00', '11:00', '12:00', '11:00'])).toEqual([
      '11:00',
      '12:00',
      '15:00',
    ]);
  });

  it('finds the first Moscow slot that is not before the start date', () => {
    expect(
      getFirstDailyRunAt(
        new Date('2026-10-08T08:30:00.000Z'),
        ['11:00', '12:00', '15:00'],
        'Europe/Moscow',
      ).toISOString(),
    ).toBe('2026-10-08T09:00:00.000Z');
  });

  it('moves to the next day after the final daily slot', () => {
    expect(
      getNextDailyRunAt(
        new Date('2026-10-08T12:00:00.000Z'),
        ['11:00', '12:00', '15:00'],
        'Europe/Moscow',
      ).toISOString(),
    ).toBe('2026-10-09T08:00:00.000Z');
  });

  it('uses the configured timezone instead of the server timezone', () => {
    expect(
      getNextDailyRunAt(
        new Date('2026-10-08T14:59:00.000Z'),
        ['11:00'],
        'America/New_York',
      ).toISOString(),
    ).toBe('2026-10-08T15:00:00.000Z');
  });
});
