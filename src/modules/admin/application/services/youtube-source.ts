const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const HANDLE = /^@[\p{L}\p{N}_.·-]{1,100}$/u;
const LEGACY = /^[\p{L}\p{N}_.-]{1,100}$/u;

/** Accept channel references, never arbitrary URLs to fetch on the server. */
export function normalizeYoutubeSource(input: string): string {
  const value = input.trim();
  if (CHANNEL_ID.test(value)) return `https://www.youtube.com/channel/${value}`;
  if (HANDLE.test(value)) return `https://www.youtube.com/${value.toLowerCase()}`;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    throw new Error('Укажите @имя или ссылку на YouTube-канал');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port ||
    !['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)
  ) {
    throw new Error('Разрешены только ссылки на YouTube-каналы');
  }
  let parts: string[];
  try {
    parts = decodeURIComponent(url.pathname).split('/').filter(Boolean);
  } catch {
    throw new Error('Некорректная ссылка на канал');
  }
  if (parts.length > 1 && ['videos', 'shorts', 'streams', 'featured'].includes(parts.at(-1)!))
    parts.pop();
  if (parts.length === 1 && HANDLE.test(parts[0]))
    return `https://www.youtube.com/${parts[0].toLowerCase()}`;
  if (parts.length === 2 && parts[0] === 'channel' && CHANNEL_ID.test(parts[1]))
    return `https://www.youtube.com/channel/${parts[1]}`;
  if (parts.length === 2 && ['c', 'user'].includes(parts[0]) && LEGACY.test(parts[1]))
    return `https://www.youtube.com/${parts[0]}/${parts[1]}`;
  throw new Error('Нужна ссылка на канал, а не отдельное видео или плейлист');
}

export function normalizeYoutubeSources(inputs: string[]): string[] {
  if (
    !Array.isArray(inputs) ||
    inputs.length > 20 ||
    inputs.some(input => typeof input !== 'string' || input.length > 300)
  ) {
    throw new Error('Разрешено до 20 каналов, по одной ссылке на строку');
  }
  return [...new Set(inputs.map(normalizeYoutubeSource))];
}

export function isYoutubeChannelId(value: unknown): value is string {
  return typeof value === 'string' && CHANNEL_ID.test(value);
}
export function isYoutubeVideoId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value);
}

/** Keep YouTube's own displayed precision; do not invent exact numbers from '1.2K'. */
export function youtubeCounterText(value: unknown): string | null {
  if (typeof value === 'number')
    return Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
  const text =
    typeof value === 'string'
      ? value
      : value && typeof value === 'object' && 'toString' in value
      ? (value as { toString(): string }).toString()
      : '';
  return typeof text === 'string' &&
    text.length <= 80 &&
    /\d/u.test(text) &&
    !/[<>\r\n]/u.test(text)
    ? text.trim()
    : null;
}

export function youtubeThumbnail(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 1000) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      (url.hostname === 'ytimg.com' || url.hostname.endsWith('.ytimg.com'))
      ? url.href
      : null;
  } catch {
    return null;
  }
}
