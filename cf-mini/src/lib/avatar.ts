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
