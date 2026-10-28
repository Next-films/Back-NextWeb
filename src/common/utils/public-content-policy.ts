/** Public catalogue only: leave the isolated admin/installer contour unchanged. */
export function canPublishCountries(countries: unknown, role = process.env.APP_ROLE): boolean {
  if (role !== 'public') return true;
  const names = (Array.isArray(countries) ? countries : [countries])
    .flatMap(value =>
      typeof value === 'string' ? value.replace(/\bn\/a\b/giu, '').split(/[,;/|]/u) : [],
    )
    .map(value =>
      value
        .normalize('NFKC')
        .toLowerCase()
        .replace(/\([^)]*\)/gu, '')
        .replace(/[\s._-]+/gu, ''),
    )
    .filter(value => value && !['unknown', 'неизвестно', 'нетданных', 'n/a', 'na'].includes(value));
  // Unknown production country is not enough to establish eligibility.
  if (names.length === 0) return false;
  const excluded = new Set([
    'россия',
    'российскаяфедерация',
    'рф',
    'russia',
    'russianfederation',
    'ru',
    'rus',
  ]);
  return !names.some(name => excluded.has(name));
}
