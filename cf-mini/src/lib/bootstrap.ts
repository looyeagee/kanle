import type { User } from "./types";

export type BootstrapProfile = {
  nickname?: string;
  avatar?: string;
  cover?: string;
  bio?: string;
  email?: string;
  siteTitle?: string;
};

declare global {
  interface Window {
    __KANLE_BOOTSTRAP__?: BootstrapProfile | null;
  }
}

const emptyOwner: User = {
  id: "owner",
  nickname: "",
  avatar: "",
  cover: "",
  bio: "",
};

export function emptyProfile(): User {
  return { ...emptyOwner };
}

export function readBootstrapProfile(): User | null {
  const raw = typeof window === "undefined" ? null : window.__KANLE_BOOTSTRAP__;
  if (!raw || typeof raw !== "object") return null;
  if (!raw.nickname && !raw.siteTitle && !raw.avatar && !raw.cover && !raw.bio) {
    return null;
  }
  return {
    id: "owner",
    nickname: raw.nickname || "",
    avatar: raw.avatar || "",
    cover: raw.cover || "",
    bio: raw.bio || "",
    email: raw.email || "",
    siteTitle: raw.siteTitle || "",
  };
}
