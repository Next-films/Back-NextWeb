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
    const { id, name, createdAt, exp } = token;
    return {
      id,
      name,
      expAt: this.getExpirationDate(createdAt, exp)?.toISOString() || null,
    };
  }

  mapTokens(tokens: ExternalApiAuth[]): ExternalApiTokenOutputDto[] {
    return tokens.map(t => this.mapToken(t));
  }

  private getExpirationDate(createdAt: Date, exp: ExternalApiTokenExpAtEnum): Date | null {
    if (exp === ExternalApiTokenExpAtEnum.F) return null;

    const amount = parseInt(exp);
    if (exp.endsWith('d')) return add(createdAt, { days: amount });
    if (exp.endsWith('w')) return add(createdAt, { weeks: amount });
    if (exp.endsWith('mo')) return add(createdAt, { months: amount });
    if (exp.endsWith('y')) return add(createdAt, { years: amount });

    return null;
  }
}
