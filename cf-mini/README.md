# kanle-mini · Cloudflare 缩小版朋友圈

Workers（静态资源 + Hono API）+ D1 + R2。不依赖 Cloudflare Pages。

## 本地运行

```bash
cd cf-mini
cp wrangler.jsonc.example wrangler.jsonc
npm install
npx wrangler d1 migrations apply kanle-mini --local
npm run dev
```

默认后台：`admin@local` / `admin123`（可在 `.dev.vars` 改 `ADMIN_BOOTSTRAP_PASSWORD`）。

评论和点赞需要 GitHub 登录。本地在 `.dev.vars` 填 `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`，OAuth 回调填 `http://localhost:5173/api/auth/github/callback`。生产回调填站点域名，并用 `wrangler secret put` 写入。

未配置 `R2_PUBLIC_BASE` 时，媒体走 `/api/media/*` 回源，本地即可预览图片和视频。生产建议给 R2 绑自定义域名（如 `https://media.example.com`），避免每张图都打 Worker。

## 上线

1. 复制 `wrangler.jsonc.example` 为 `wrangler.jsonc`（此文件已 gitignore，不要提交）
2. `npx wrangler d1 create kanle-mini`，把返回的 `database_id` 填进 `wrangler.jsonc`
3. `npx wrangler r2 bucket create kanle-mini-media`
4. 可选：给 R2 桶绑自定义域名，把 `R2_PUBLIC_BASE` 写成 `https://media.example.com`（本地 `.dev.vars` 留空，继续走 Worker 回源）
5. `npx wrangler secret put JWT_SECRET`
6. 可选：创建 [GitHub OAuth App](https://github.com/settings/developers)，Authorization callback URL 填 `https://你的域名/api/auth/github/callback`，然后：
   `npx wrangler secret put GITHUB_CLIENT_ID`
   `npx wrangler secret put GITHUB_CLIENT_SECRET`
7. `npx wrangler d1 migrations apply kanle-mini --remote`
8. `npm run deploy`

## 功能

- 首页朋友圈信息流：文字、图片、实况图（Android JPEG 自动拆分）、上传视频
- 点赞 / 评论（需 GitHub 登录；管理员账号也可）
- 左侧文章列表 + Markdown 文章详情
- 后台发动态、发文章
