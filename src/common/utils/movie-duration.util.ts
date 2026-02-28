export class MovieDurationUtil {
  static parseDurationToSeconds(string: string): number {
    const hourMatch = string.match(/(\d+)\s*ч/);
    const minuteMatch = string.match(/(\d+)\s*мин/);

    const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
    const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;

    return hours * 3600 + minutes * 60;
  }

  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return `${hours} ч ${minutes} мин`;
  }
}
