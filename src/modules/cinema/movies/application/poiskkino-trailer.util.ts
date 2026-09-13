export function buildPoiskkinoTrailerPlayerUrl(kpId: string | null | undefined): string | null {
  const normalizedKpId = kpId?.trim();

  if (!normalizedKpId || !/^\d{4,}$/.test(normalizedKpId)) return null;

  return `https://play.poiskkino.dev/embed/${normalizedKpId}`;
}
