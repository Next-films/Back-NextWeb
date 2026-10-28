import { canPublishCountries } from './public-content-policy';

describe('Public production-country policy', () => {
  it.each([
    'Россия',
    'РОССИЯ',
    'Российская Федерация',
    'РФ',
    'Russia',
    'Russian Federation',
    'RU',
    'RUS',
    'Российская Федерация (РФ)',
    'Россия (RU)',
  ])('excludes %s and co-productions', country => {
    expect(canPublishCountries([country], 'public')).toBe(false);
    expect(canPublishCountries(['США', country], 'public')).toBe(false);
  });
  it.each([undefined, null, [], [''], ['   '], ['unknown'], ['N/A']])(
    'hides missing country metadata: %j',
    countries => {
      expect(canPublishCountries(countries, 'public')).toBe(false);
    },
  );
  it('recognizes comma-separated co-productions but not audio language or Soviet origin', () => {
    expect(canPublishCountries(['США, Россия'], 'public')).toBe(false);
    expect(canPublishCountries(['США', 'Япония'], 'public')).toBe(true);
    expect(canPublishCountries(['СССР'], 'public')).toBe(true);
  });
  it('does not restrict the isolated internal contour', () => {
    expect(canPublishCountries(['Россия'], 'internal')).toBe(true);
    expect(canPublishCountries([], undefined)).toBe(true);
  });
});
