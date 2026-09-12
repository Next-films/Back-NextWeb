import { MovieTypesEnum } from '@/common/types/types';

const STORAGE_ROOTS = new Set([
  'films',
  'cartoons',
  'serials',
  'preview-clip',
  'horizontal-posters',
  'posters',
  'logo',
]);

function extractStorageKey(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;

  let pathname: string;

  try {
    pathname = new URL(value).pathname;
  } catch {
    pathname = value.split('?')[0];
  }

  const parts = pathname.split('/').filter(Boolean);
  const rootIndex = parts.findIndex(part => STORAGE_ROOTS.has(part));

  if (rootIndex < 0 || rootIndex === parts.length - 1) return null;
  return parts.slice(rootIndex).join('/');
}

export function buildMovieStorageKeys(
  type: MovieTypesEnum,
  movieId: number,
  urls: Array<string | null | undefined>,
): string[] {
  const generatedKeys = [
    `preview-clip/${type}/${movieId}/preview_clip/background.webm`,
    `preview-clip/${type}/${movieId}/trailer/trailer.mp4`,
    `posters/${type}/${movieId}/poster.webp`,
    `logo/${type}/${movieId}/logo.webp`,
  ];

  return Array.from(
    new Set(
      [...urls, ...generatedKeys]
        .map(value => extractStorageKey(value))
        .filter((key): key is string => Boolean(key)),
    ),
  );
}
