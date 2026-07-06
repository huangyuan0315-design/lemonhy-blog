---
title: "Astro + Cloudflare Pages 博客搭建指南"
description: "详细介绍如何使用 Astro 框架和 Cloudflare Pages 搭建一个现代静态博客的完整流程。"
pubDate: 2026-07-05
category: tech
tags: ["astro", "cloudflare", "教程", "前端"]
---

## 为什么选择 Astro

Astro 是一个现代化的静态网站生成器，它的核心理念是"**零 JavaScript 默认输出**"。与传统框架不同，Astro 在服务端渲染所有内容，只在需要交互的地方加载 JavaScript（称为"岛屿架构"）。

### Astro 的优势

1. **极致的性能** — 默认零 JS，HTML 直接渲染
2. **内容优先** — 一流的 Markdown/MDX 支持
3. **灵活的 UI** — 可以在同一项目中混合使用 React、Vue、Svelte 组件
4. **出色的 DX** — TypeScript 默认支持，优秀的错误提示

## Cloudflare Pages 部署

Cloudflare Pages 是 Cloudflare 的 Jamstack 托管平台，特点包括：

- 全球 300+ 边缘节点
- 自动 Git 集成和部署
- 免费 SSL 证书
- 无限的带宽

### 部署流程

```bash
# 1. 创建 Astro 项目
npm create astro@latest

# 2. 添加 Cloudflare 适配器
npx astro add cloudflare

# 3. 构建
npm run build

# 4. 部署到 Cloudflare Pages
npx wrangler pages deploy dist
```

## 评论系统的实现

使用 Cloudflare Workers + D1 数据库实现评论功能：

```sql
-- D1 数据库表结构
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug TEXT NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);
```

## 总结

Astro + Cloudflare 的组合非常适合个人博客场景：开发体验好、性能优秀、运维成本低、完全免费。
