import { ApiProperty } from '@nestjs/swagger';
import { Injectable } from '@nestjs/common';
import { ExternalApiAuth } from '@/external-auth/domain/external-api-auth.entity';
import { ExternalApiTokenExpAtEnum } from '@/external-auth/domain/types';
import { add } from 'date-fns';

export class ExternalApiTokenOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  expAt: string | null;
}

@Injectable()
export class ExternalApiTokenOutputModelMapper {
  mapToken(token: ExternalApiAuth): ExternalApiTokenOutputDto {
    const { id, name, exp, updatedAt } = token;
    return {
      id,
      name,
      expAt: this.getExpirationDate(updatedAt, exp)?.toISOString() || null,
    };
  }

  mapTokens(tokens: ExternalApiAuth[]): ExternalApiTokenOutputDto[] {
    return tokens.map(t => this.mapToken(t));
  }

  getExpirationDate(date: Date, exp: ExternalApiTokenExpAtEnum): Date | null {
    if (exp === ExternalApiTokenExpAtEnum.F) return null;

    const amount = parseInt(exp);
    if (exp.endsWith('d')) return add(date, { days: amount });
    if (exp.endsWith('w')) return add(date, { weeks: amount });
    if (exp.endsWith('mo')) return add(date, { months: amount });
    if (exp.endsWith('y')) return add(date, { years: amount });

    return null;
  }
}
