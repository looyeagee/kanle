import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import type { AdminJwt } from "./auth";

const SESSION_COOKIE = "gh_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

export type GithubUser = {
  kind: "github";
  sub: string;
  login: string;
  nickname: string;
  avatar: string;
  email: string;
};

export type Actor = {
  username: string;
  nickname: string;
  avatar: string;
  email: string;
};

type CookieReq = Context;

function cookieBase(url: string) {
  const secure = new URL(url).protocol === "https:";
  return { httpOnly: true, path: "/", sameSite: "Lax" as const, secure };
}

export function githubConfigured(env: Env): boolean {
  return !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.JWT_SECRET);
}

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return "/";
  return raw;
}

export function githubCallbackUrl(requestUrl: string): string {
  const url = new URL(requestUrl);
  return `${url.origin}/api/auth/github/callback`;
}

export async function beginGithubLogin(c: Context): Promise<Response> {
  if (!githubConfigured(c.env)) {
    return c.json({ message: "未配置 GitHub 登录" }, 501);
  }
  const next = safeNextPath(c.req.query("next"));
  const state = await sign(
    { kind: "gh_oauth", next, exp: Math.floor(Date.now() / 1000) + 600 },
    c.env.JWT_SECRET,
    "HS256"
  );
  const params = new URLSearchParams({
    client_id: c.env.GITHUB_CLIENT_ID!,
    redirect_uri: githubCallbackUrl(c.req.url),
    scope: "read:user user:email",
    state,
  });
  return c.redirect(`https://github.com/login/oauth/authorize?${params}`, 302);
}

export async function finishGithubLogin(c: Context): Promise<Response> {
  if (!githubConfigured(c.env)) {
    return c.json({ message: "未配置 GitHub 登录" }, 501);
  }
  const url = new URL(c.req.url);
  const opts = cookieBase(c.req.url);
  const code = c.req.query("code") || "";
  const state = c.req.query("state") || "";
  let next = "/";
  try {
    const payload = (await verify(state, c.env.JWT_SECRET, "HS256")) as { kind?: string; next?: string };
    if (payload.kind !== "gh_oauth") throw new Error("bad state");
    next = safeNextPath(payload.next);
  } catch {
    return c.redirect(`${url.origin}/?auth=denied`, 302);
  }
  if (!code) {
    return c.redirect(`${url.origin}/?auth=denied`, 302);
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: githubCallbackUrl(c.req.url),
    }),
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenJson.access_token) {
    return c.redirect(`${url.origin}/?auth=failed`, 302);
  }

  const ghHeaders = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${tokenJson.access_token}`,
    "User-Agent": "kanle-mini",
  };
  const userRes = await fetch("https://api.github.com/user", { headers: ghHeaders });
  const user = (await userRes.json()) as {
    id?: number;
    login?: string;
    name?: string | null;
    avatar_url?: string;
    email?: string | null;
  };
  if (!user.id || !user.login) {
    return c.redirect(`${url.origin}/?auth=failed`, 302);
  }

  let email = (user.email || "").trim();
  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", { headers: ghHeaders });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as Array<{ email?: string; primary?: boolean; verified?: boolean }>;
      email =
        emails.find((e) => e.primary && e.verified)?.email ||
        emails.find((e) => e.verified)?.email ||
        emails[0]?.email ||
        "";
    }
  }

  const payload: GithubUser & { exp: number } = {
    kind: "github",
    sub: String(user.id),
    login: user.login,
    nickname: (user.name || "").trim() || user.login,
    avatar: user.avatar_url || "",
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const jwt = await sign(payload, c.env.JWT_SECRET, "HS256");
  setCookie(c, SESSION_COOKIE, jwt, { ...opts, maxAge: SESSION_MAX_AGE });
  return c.redirect(`${url.origin}${next}`, 302);
}

export async function getGithubUserFromRequest(c: CookieReq): Promise<GithubUser | null> {
  const token = getCookie(c, SESSION_COOKIE) || "";
  if (!token || !c.env.JWT_SECRET) return null;
  try {
    const payload = (await verify(token, c.env.JWT_SECRET, "HS256")) as GithubUser & { exp?: number };
    if (payload.kind !== "github" || !payload.sub || !payload.login) return null;
    return {
      kind: "github",
      sub: payload.sub,
      login: payload.login,
      nickname: payload.nickname || payload.login,
      avatar: payload.avatar || "",
      email: payload.email || "",
    };
  } catch {
    return null;
  }
}

export function clearGithubSession(c: CookieReq): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export async function getActor(
  c: CookieReq,
  admin: AdminJwt | null
): Promise<Actor | null> {
  if (admin) {
    const row = await c.env.DB.prepare("SELECT nickname, email, avatar FROM admins WHERE id = ?")
      .bind(admin.sub)
      .first<{ nickname: string; email: string; avatar: string }>();
    return {
      username: "admin",
      nickname: (row?.nickname || admin.nickname || "管理员").trim() || "管理员",
      avatar: row?.avatar || "",
      email: row?.email || admin.email || "",
    };
  }
  const gh = await getGithubUserFromRequest(c);
  if (!gh) return null;
  return {
    username: gh.login,
    nickname: gh.nickname || gh.login,
    avatar: gh.avatar || "",
    email: gh.email || `${gh.login}@users.noreply.github.com`,
  };
}
