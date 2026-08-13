import { getProfile, type Profile } from "./posts";

const fallbackProfile: Profile = {
  nickname: "看了",
  avatar: "",
  cover: "",
  bio: "",
  email: "",
  siteTitle: "看了",
};

function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function siteTitleOf(profile: { siteTitle: string; nickname: string }): string {
  return (profile.siteTitle || profile.nickname || "看了").trim() || "看了";
}

async function articleTitle(env: Env, pathname: string): Promise<string> {
  const id = pathname.match(/^\/articles\/([^/]+)\/?$/)?.[1];
  if (!id) return "";
  try {
    const row = await env.DB.prepare(
      "SELECT title FROM posts WHERE id = ? AND type = 'article' LIMIT 1"
    )
      .bind(id)
      .first<{ title: string }>();
    return (row?.title || "").trim();
  } catch {
    return "";
  }
}

async function loadProfile(env: Env): Promise<Profile> {
  try {
    return await getProfile(env.DB);
  } catch (err) {
    console.error("ssr profile", err);
    return fallbackProfile;
  }
}

export async function serveSpa(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const [profile, postTitle, assetRes] = await Promise.all([
    loadProfile(env),
    articleTitle(env, url.pathname),
    env.ASSETS.fetch(request),
  ]);

  const contentType = assetRes.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return assetRes;

  const siteTitle = siteTitleOf(profile);
  const title = postTitle ? `${postTitle} - ${siteTitle}` : siteTitle;
  const payload = jsonForScript({
    nickname: profile.nickname,
    avatar: profile.avatar,
    cover: profile.cover,
    bio: profile.bio,
    email: profile.email,
    siteTitle: profile.siteTitle,
  });

  const headers = new Headers(assetRes.headers);
  headers.set("Cache-Control", "private, no-cache");

  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(title);
      },
    })
    .on("script#kanle-bootstrap", {
      element(el) {
        el.setInnerContent(`window.__KANLE_BOOTSTRAP__=${payload}`);
      },
    })
    .transform(new Response(assetRes.body, { status: assetRes.status, headers }));
}
