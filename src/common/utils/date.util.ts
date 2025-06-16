import { Injectable } from '@nestjs/common';
import { format, parseISO } from 'date-fns';

@Injectable()
export class DateUtil {
  formatDateDdMmYy(date: string): string {
    const parsedDate = parseISO(date);
    return format(parsedDate, 'dd.MM.yy');
  }
}
