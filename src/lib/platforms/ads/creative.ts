import type { MetaAd } from "../meta/client";

export function safeWebUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function metaCreative(ad: MetaAd) {
  const creative = ad.creative;
  const spec = creative?.object_story_spec;
  const story = creative?.effective_object_story_id;
  return {
    creativeUrl: safeWebUrl(spec?.link_data?.link ?? spec?.template_data?.link ?? spec?.video_data?.call_to_action?.value?.link ?? creative?.object_url),
    creativeThumbnail: safeWebUrl(creative?.image_url ?? creative?.thumbnail_url),
    creativeBody: creative?.body ?? spec?.link_data?.message ?? spec?.template_data?.message ?? spec?.video_data?.message ?? null,
    creativePostUrl: safeWebUrl(creative?.instagram_permalink_url) ?? (story && /^\d+_\d+$/.test(story) ? `https://www.facebook.com/${story}` : null),
  };
}

// Match only verified store domains, not another shop with the same product handle.
export function productHandleFromAd(destination: string | null, domains: string[]): string | null {
  const safe = safeWebUrl(destination);
  if (!safe) return null;
  const url = new URL(safe);
  if (!domains.map((domain) => domain.toLowerCase()).includes(url.hostname.toLowerCase())) return null;
  const match = url.pathname.match(/(?:^|\/)products\/([^/]+)\/?$/);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
}
