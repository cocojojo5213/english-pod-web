# 部署说明

- 访问域名：`https://english.52131415.xyz`。
- 前端和课程 API：Cloudflare Pages 项目 `english-pod-web`。`functions/api/` 读取构建时生成的公开课程 JSON。
- Pages 入口：Worker `english-pod-pages-proxy`，路由 `english.52131415.xyz/*`。它从 `english-pod-web.pages.dev` 获取页面和 API。
- 音频：更具体的 `english.52131415.xyz/media/*` 路由仍由 `english-pod-audio` Worker 从 R2 提供。
- DNS：`english.52131415.xyz` 是代理开启的 `192.0.2.1` 占位 A 记录；所有请求由上述 Worker 路由处理，不连接该地址。
- 本机 `english-pod-web.service` 已停用，专用 `english-pod-cloudflared` Tunnel 已停止。保留配置用于故障回退。
- 课程原始音频、字幕和导入流程仍在 `/home/ubuntu/english pod` 与本仓库；这些内容不纳入 Git。运行中的网站不依赖本机在线。

## 发布内容更新

本仓库的 `data/` 被 Git 忽略。发布机需要有导入后的 `data/catalog.json` 和 `data/courses/*.json`；可用 `DATA_ROOT` 指定另一份私有数据目录。不要将整个 `data/` 上传到 Pages，其中有整理记录和覆盖文件。

```bash
cd /home/ubuntu/services/english-pod-web
npm ci
npm run import             # 仅在音频、字幕或整理内容改变后运行
npm run build:pages
npm test
npx playwright test
set -a
. /home/ubuntu/services/cloudflare/env/cf-global.env
set +a
CLOUDFLARE_EMAIL="$CF_EMAIL" CLOUDFLARE_API_KEY="$CF_GLOBAL_API_KEY" \
  wrangler pages deploy dist --project-name english-pod-web --branch main
```

Wrangler 使用本机已配置的 Cloudflare 凭据；不要把值写进仓库。`npm run build` 只生成前端，不会生成 Pages API 数据；发布时必须使用 `build:pages`。Pages 项目采用直接上传，无法仅凭不含私有课程数据的 Git 检出重建。

只改动入口 Worker 时，按同样方式给 `wrangler deploy --config cloudflare/pages-proxy.wrangler.json` 传入凭据。音频 Worker 单独部署，不属于普通网页更新。

## 验证

```bash
curl -fsS https://english-pod-web.pages.dev/api/health
curl -fsS https://english.52131415.xyz/api/health
curl -sSI https://english.52131415.xyz/ | grep -i x-english-edge-source
curl -sSI https://english.52131415.xyz/media/beginner-01 | grep -i x-audio-source
```

预览域名 `*.pages.dev` 不接入音频 Worker；完整播放须在正式域名检查。收藏和进度仍只保存在浏览器 `localStorage` 中，域名未变，因此现有浏览器数据保留。

## 回退

普通内容发布可重新部署上一份已验证的 Pages 构建。若 Pages 或入口 Worker 持续故障：先启动本机 `english-pod-web.service` 和 `/home/ubuntu/services/cloudflare/tunnels/english-pod` 中的 Compose Tunnel；再把 DNS 改回 `4503742a-45e6-42c1-96d3-2460bea64d54.cfargotunnel.com`，并移除 `english.52131415.xyz/*` 的 Pages 代理路由。保留更具体的音频 Worker 路由，最后验证首页和 `/api/health`。

## 已知边界

网站和课程媒体公开可访问，不提供 DRM。讲义基于自动字幕片段，尚未逐课人工校订。媒体修复保留的三份 `.m4a.incomplete` 原文件与下载状态仍在本机，不参与课程导入。
