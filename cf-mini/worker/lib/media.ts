export function publicMediaUrl(env: Env, key: string): string {
  const base = (env.R2_PUBLIC_BASE || "").replace(/\/$/, "");
  if (base) return `${base}/${key}`;
  return `/api/media/${key}`;
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
