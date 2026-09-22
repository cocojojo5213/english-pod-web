# English Pod

一个简洁、响应式的英语听力学习网站。设计采用大留白、低饱和色彩、圆角卡片和清晰排版；不是 Apple 官方产品。

## 功能

- 课程分级、搜索、原音播放、倍速、拖动与字幕同步。
- 从节目英文字幕识别词汇讲解、短语搭配、地道表达等章节。
- 末尾 Audio Review 原文、词汇/表达和英文解释表、逐条原音回听。
- 完整播客、Dialogue 循环与词汇复习三个入口，课程按标题中的 Episode 升序排列。
- 词汇表自动提取的条目明确标记待核对；允许用私有 `data/review-overrides.json` 补充逐课整理结果。
- 全文保留来源时间轴，当前字幕和自动对话边界尚未完成听校。
- 收藏讲解、浏览器本地播放进度与断点续听。
- 手机和桌面布局；音频支持 HTTP Range。

## 本地运行

需要 Node.js 22+、Python 3、FFprobe，以及自己合法持有的课程音频和字幕。

```bash
npm ci
MEDIA_ROOT=/path/to/media npm run import
npm run build
MEDIA_ROOT=/path/to/media PORT=18341 npm start
```

媒体目录结构：

```text
初级/
  01 - 课程名.m4a
  01 - 课程名.clean.srt
中级/
高级/
```

导入结果写入 `data/`，可通过 `DATA_ROOT` 覆盖。`.m4a.aria2` 仍存在的音频标为不可用。服务仅监听 `127.0.0.1`，需要外部访问时配置自己的反向代理或 Tunnel。

## 验证

先启动服务：

```bash
npm test
npx playwright install chromium
npx playwright test
```

当前测试针对本部署的 111 课资料，包括三课补全音频 Range 检查。自建数据集时需修改数量及样本 ID。

## 内容准确度与隐私

- 当前讲义为**节目原文摘录**，不是人工校对的独立词典。章节和标题由规则识别，原始自动字幕可能存在误听和断句偏差。
- 不虚构节目没有讲过的定义或例句。所有讲义片段均有原音时间范围。
- 收藏和进度存在浏览器 localStorage，不支持跨设备同步；清除网站数据将删除这些记录。
- 公开部署无账号系统，任何持有网址的人都可访问课程。
- 本仓库只提供软件，不包含第三方音频、字幕、生成讲义、运行状态及凭据。部署者负责取得内容使用和公开传播所需的授权。

## 本机部署

见 [DEPLOYMENT.md](DEPLOYMENT.md)。
