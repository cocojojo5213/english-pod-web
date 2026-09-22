# 部署说明

- 访问域名：`https://english.52131415.xyz`
- 源站：`127.0.0.1:18341`
- 应用路径：`/home/ubuntu/services/english-pod-web`
- 音频与字幕：`/home/ubuntu/english pod`，只读使用，不纳入仓库。
- 应用单元：用户级 `english-pod-web.service`。
- 独立 Tunnel：`english-pod-cloudflared` 容器，配置在 Cloudflare 远程管理；仅发布上述域名，其余路径主机落入 404。
- Tunnel 编排路径：`/home/ubuntu/services/cloudflare/tunnels/english-pod`，凭据文件不提交。

## 更新

```bash
npm ci
npm run import
npm run build
npm test
npx playwright test
systemctl --user restart english-pod-web.service
```

导入后须重启服务以刷新内存课程目录。

## 验证

```bash
curl -fsS http://127.0.0.1:18341/api/health
curl -fsS https://english.52131415.xyz/api/health
```

## 停止与回滚

停止用户级应用服务和专用 Tunnel 即可撤下此站，不需要修改其他应用。代码回滚至上一个已验证提交，重新构建并仅重启此服务。媒体修复保留了三份 `.m4a.incomplete` 原文件；对应下载状态也以 `.incomplete` 后缀保留，不参与课程导入。

## 已知边界

网站为公开访问，课程媒体也可被公开获取；不提供 DRM。收藏、进度仅保存在本浏览器。讲义是基于自动字幕的原文讲解片段，尚未逐课人工校订或转写为结构化词汇卡片。
