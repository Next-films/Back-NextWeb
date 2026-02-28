import { Injectable } from '@nestjs/common';
import { format, isValid, parseISO } from 'date-fns';

@Injectable()
export class DateUtil {
  formatDateDdMmYy(date: string): string {
    const parsedDate = parseISO(date);
    return format(parsedDate, 'dd.MM.yy');
  }

  formatDateYyMmDd(date: string | Date): string {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(parsedDate)) {
      throw new Error(`Not valid date`);
    }

    return parsedDate.toISOString().split('T')[0];
  }

  formatDateYyMmDdHhMm(date: string | Date): string {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(parsedDate)) {
      throw new Error(`Not valid date`);
    }

    return format(parsedDate, 'yyyy-MM-dd HH:mm');
  }
}
