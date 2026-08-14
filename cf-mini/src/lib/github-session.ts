import { useEffect, useState } from "react";
import { api } from "./api";
import { getAdmin } from "./auth";

export type GithubUser = {
  id: string;
  login: string;
  nickname: string;
  avatar: string;
  email: string;
};

type GithubMe = { user: GithubUser | null; configured?: boolean };

let current: GithubUser | null = null;
let configured = false;
let loaded = false;
let inflight: Promise<GithubUser | null> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function getGithubUser(): GithubUser | null {
  return current;
}

export function githubLoginHref(next = window.location.pathname + window.location.search + window.location.hash) {
  return `/api/auth/github?next=${encodeURIComponent(next || "/")}`;
}

export function startGithubLogin() {
  window.location.href = githubLoginHref();
}

export function isSignedIn() {
  return !!getAdmin() || !!current;
}

export async function refreshGithubUser() {
  if (inflight) return inflight;
  inflight = api<GithubMe>("/auth/github/me")
    .then((data) => {
      current = data.user;
      configured = data.configured !== false;
      loaded = true;
      emit();
      return current;
    })
    .catch(() => {
      current = null;
      loaded = true;
      emit();
      return null;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function logoutGithub() {
  await api("/auth/github/logout", { method: "POST" });
  current = null;
  loaded = true;
  emit();
}

export function useGithubUser() {
  const [user, setUser] = useState(current);
  const [ready, setReady] = useState(loaded);
  const [oauthEnabled, setOauthEnabled] = useState(configured);
  useEffect(() => {
    const onChange = () => {
      setUser(current);
      setReady(loaded);
      setOauthEnabled(configured);
    };
    listeners.add(onChange);
    void refreshGithubUser();
    return () => {
      listeners.delete(onChange);
    };
  }, []);
  return { user, ready, configured: oauthEnabled, signedIn: !!getAdmin() || !!user };
}
