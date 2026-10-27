import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminShortContentLogoInputDto } from './admin-short-content-logo.input.dto';

describe('AdminShortContentLogoInputDto', () => {
  const valid = { enabled: true, widthPercent: 22.2, xPercent: 50, yPercent: 7.8125 };

  it('accepts fractional size and positions', async () => {
    expect(await validate(plainToInstance(AdminShortContentLogoInputDto, valid))).toHaveLength(0);
  });

  it.each([
    {},
    { ...valid, enabled: 'false' },
    { ...valid, widthPercent: 4 },
    { ...valid, widthPercent: 76 },
    { ...valid, xPercent: -1 },
    { ...valid, yPercent: 101 },
    { ...valid, yPercent: Infinity },
  ])('rejects invalid settings %p', async input => {
    expect(
      (await validate(plainToInstance(AdminShortContentLogoInputDto, input))).length,
    ).toBeGreaterThan(0);
  });
});
