type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

function getZonedParts(date: Date, timeZone: string): ZonedDateParts {
  const values = Object.fromEntries(
    getFormatter(timeZone)
      .formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)]),
  );

  return values as ZonedDateParts;
}

function getOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return localAsUtc - Math.floor(date.getTime() / 1_000) * 1_000;
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let result = localAsUtc - getOffsetMs(new Date(localAsUtc), timeZone);

  // A second pass handles dates on the other side of a daylight-saving change.
  result = localAsUtc - getOffsetMs(new Date(result), timeZone);
  return new Date(result);
}

export function normalizeDailyTimes(dailyTimes?: string[] | null): string[] | null {
  if (!dailyTimes?.length) return null;
  return [...new Set(dailyTimes)].sort((left, right) => left.localeCompare(right));
}

export function assertValidTimeZone(timeZone: string): void {
  getFormatter(timeZone).format(new Date());
}

/** Returns the first configured local time strictly after `after`. */
export function getNextDailyRunAt(after: Date, dailyTimes: string[], timeZone: string): Date {
  assertValidTimeZone(timeZone);
  const times = normalizeDailyTimes(dailyTimes);

  if (!times) throw new Error('At least one daily publication time is required');

  const localAfter = getZonedParts(after, timeZone);

  for (let dayOffset = 0; dayOffset < 370; dayOffset += 1) {
    const calendarDay = new Date(
      Date.UTC(localAfter.year, localAfter.month - 1, localAfter.day + dayOffset),
    );
    const year = calendarDay.getUTCFullYear();
    const month = calendarDay.getUTCMonth() + 1;
    const day = calendarDay.getUTCDate();

    for (const time of times) {
      const [hour, minute] = time.split(':').map(Number);
      const candidate = zonedDateTimeToUtc(year, month, day, hour, minute, timeZone);

      if (candidate.getTime() > after.getTime()) return candidate;
    }
  }

  throw new Error('Cannot calculate the next daily publication time');
}

export function getFirstDailyRunAt(notBefore: Date, dailyTimes: string[], timeZone: string): Date {
  return getNextDailyRunAt(new Date(notBefore.getTime() - 1), dailyTimes, timeZone);
}
