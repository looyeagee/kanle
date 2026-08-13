# kanle-mini · Cloudflare 缩小版朋友圈

Workers（静态资源 + Hono API）+ D1 + R2。不依赖 Cloudflare Pages。

## 本地运行

```bash
cd cf-mini
npm install
npx wrangler d1 migrations apply kanle-mini --local
npm run dev
```

默认后台：`admin@local` / `admin123`（可在 `.dev.vars` 改 `ADMIN_BOOTSTRAP_PASSWORD`）。

未配置 `R2_PUBLIC_BASE` 时，媒体走 `/api/media/*` 回源，本地即可预览图片和视频。

## 上线

1. `npx wrangler d1 create kanle-mini`，把返回的 `database_id` 填进 `wrangler.jsonc`
2. `npx wrangler r2 bucket create kanle-mini-media`
3. 可选：打开 R2 公开访问，把域名写入 secret/var `R2_PUBLIC_BASE`（如 `https://pub-xxx.r2.dev`）
4. `npx wrangler secret put JWT_SECRET`
5. `npx wrangler d1 migrations apply kanle-mini --remote`
6. `npm run deploy`

## 功能

- 首页朋友圈信息流：文字、图片、实况图（Android JPEG 自动拆分）、上传视频
- 点赞 / 评论
- 左侧文章列表 + Markdown 文章详情
- 后台发动态、发文章
