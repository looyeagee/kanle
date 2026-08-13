const WORKER_MEDIA_PREFIX = "/api/media/";
const CACHE_CONTROL = "public, max-age=31536000, immutable";

export const MEDIA_CACHE_CONTROL = CACHE_CONTROL;

function publicBase(env: Env): string {
  return (env.R2_PUBLIC_BASE || "").replace(/\/$/, "");
}

export function publicMediaUrl(env: Env, key: string): string {
  const base = publicBase(env);
  if (base) return `${base}/${key}`;
  return `${WORKER_MEDIA_PREFIX}${key}`;
}

/** 把库里已存的 Worker 媒体路径改成 R2 公网域名，本地未配置时原样返回。 */
export function rewriteMediaUrl(env: Env, url: string | undefined | null): string {
  if (!url) return url || "";
  const base = publicBase(env);
  if (!base) return url;
  if (url.startsWith(WORKER_MEDIA_PREFIX)) {
    return `${base}/${url.slice(WORKER_MEDIA_PREFIX.length)}`;
  }
  return url;
}

export function rewriteMediaText(env: Env, text: string | undefined | null): string {
  if (!text) return text || "";
  const base = publicBase(env);
  if (!base) return text;
  return text.split(WORKER_MEDIA_PREFIX).join(`${base}/`);
}

export function buildObjectKey(kind: "image" | "video" | "live", ext: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const id = crypto.randomUUID();
  const safeExt = ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return `uploads/${kind}/${year}/${month}/${id}${safeExt}`;
}

export function extFromName(name: string, fallback: string): string {
  const m = /\.[a-zA-Z0-9]+$/.exec(name || "");
  return m ? m[0].toLowerCase() : fallback;
}
