import { githubLoginFromCookie } from "./github";
import { getProfile, loadHomeBootstrap, type Profile } from "./posts";

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

function isHomePath(pathname: string): boolean {
  return pathname === "/" || pathname === "";
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
    return await getProfile(env.DB, env);
  } catch (err) {
    console.error("ssr profile", err);
    return fallbackProfile;
  }
}

function profilePayload(profile: Profile) {
  return {
    nickname: profile.nickname,
    avatar: profile.avatar,
    cover: profile.cover,
    bio: profile.bio,
    email: profile.email,
    siteTitle: profile.siteTitle,
  };
}

type HomeBoot = {
  profile: Profile;
  posts?: unknown;
  postsHasMore?: boolean;
  articles?: unknown;
  articlesHasMore?: boolean;
};

export async function serveSpa(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const home = isHomePath(url.pathname);
  const [boot, postTitle, assetRes] = await Promise.all([
    home
      ? (async (): Promise<HomeBoot> => {
          try {
            const actorUsername = await githubLoginFromCookie(request, env);
            return await loadHomeBootstrap(env.DB, env, actorUsername);
          } catch (err) {
            console.error("ssr home", err);
            return { profile: await loadProfile(env) };
          }
        })()
      : loadProfile(env).then((profile): HomeBoot => ({ profile })),
    articleTitle(env, url.pathname),
    env.ASSETS.fetch(request),
  ]);

  const contentType = assetRes.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return assetRes;

  const profile = boot.profile || fallbackProfile;
  const siteTitle = siteTitleOf(profile);
  const title = postTitle ? `${postTitle} - ${siteTitle}` : siteTitle;
  const payload = jsonForScript({
    ...profilePayload(profile),
    ...(Array.isArray(boot.posts)
      ? {
          posts: boot.posts,
          postsHasMore: boot.postsHasMore,
          articles: boot.articles,
          articlesHasMore: boot.articlesHasMore,
        }
      : {}),
  });

  const headers = new Headers(assetRes.headers);
  headers.set("Cache-Control", "private, no-cache");

  const icon = (profile.avatar || "").trim();

  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(title);
      },
    })
    .on("link#kanle-icon", {
      element(el) {
        if (icon) el.setAttribute("href", icon);
      },
    })
    .on("link#kanle-apple-icon", {
      element(el) {
        if (icon) el.setAttribute("href", icon);
      },
    })
    .on("script#kanle-bootstrap", {
      element(el) {
        el.setInnerContent(`window.__KANLE_BOOTSTRAP__=${payload}`);
      },
    })
    .transform(new Response(assetRes.body, { status: assetRes.status, headers }));
}
