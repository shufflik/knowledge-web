export function generateId(prefix: string = 'id'): string {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${now}_${rand}`;
}

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return !!u.protocol && !!u.host;
  } catch {
    return false;
  }
}

export async function fetchLinkPreview(url: string): Promise<{ image?: string; title?: string } | null> {
  // No external API due to CORS in browser; best-effort: try oEmbed for common sites.
  // Fallback to no image; user can attach manually. This keeps app offline-first.
  try {
    const providers = [
      { match: /youtube\.com|youtu\.be/, endpoint: 'https://www.youtube.com/oembed?format=json&url=' },
      { match: /vimeo\.com/, endpoint: 'https://vimeo.com/api/oembed.json?url=' },
      { match: /twitter\.com|x\.com/, endpoint: 'https://publish.twitter.com/oembed?omit_script=1&url=' },
    ];
    const provider = providers.find(p => p.match.test(url));
    if (!provider) return null;
    const res = await fetch(provider.endpoint + encodeURIComponent(url));
    if (!res.ok) return null;
    const json = await res.json();
    const thumbnail = (json.thumbnail_url || json.thumbnail_url_with_play_button) as string | undefined;
    const title = (json.title as string | undefined) || undefined;
    return { image: thumbnail, title };
  } catch {
    return null;
  }
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export function truncateMiddle(text: string, maxLen = 50): string {
  if (!text) return text;
  if (text.length <= maxLen) return text;
  const keep = maxLen - 2; // account for '..'
  const left = Math.ceil(keep / 2);
  const right = Math.floor(keep / 2);
  return text.slice(0, left) + '..' + text.slice(text.length - right);
}


