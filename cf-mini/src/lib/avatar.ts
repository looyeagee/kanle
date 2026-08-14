import md5 from "blueimp-md5";

export function cravatarUrl(email: string, size = 200): string {
  const hash = md5((email || "").trim().toLowerCase() || "guest");
  return `https://cravatar.com/avatar/${hash}?s=${size}&d=identicon&r=g`;
}

export function resolveAvatar(avatar: string, email: string, size = 200): string {
  if (avatar && avatar.trim()) return avatar;
  return cravatarUrl(email, size);
}

export function actorAvatarUrl(email: string, name: string, size = 64): string {
  const source = (email || "").trim().toLowerCase() || (name || "访客").trim().toLowerCase();
  return cravatarUrl(source, size);
}

export function applyFavicon(url: string) {
  if (typeof document === "undefined") return;
  const href = url.trim();
  if (!href) return;
  const targets = [
    document.querySelector<HTMLLinkElement>("link#kanle-icon"),
    document.querySelector<HTMLLinkElement>("link#kanle-apple-icon"),
  ];
  for (const link of targets) {
    if (link) link.href = href;
  }
}
