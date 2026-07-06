---
title: "Astro + Cloudflare Pages 博客搭建指南"
description: "详细介绍如何使用 Astro 框架和 Cloudflare Pages 搭建一个现代静态博客。"
pubDate: 2026-07-05
category: tech
tags: ["astro", "cloudflare", "教程", "前端"]
---

## 为什么选择 Astro

Astro 是现代化的静态网站生成器，核心理念是零 JavaScript 默认输出。

### 优势

1. **极致性能** — 默认零 JS，HTML 直接渲染
2. **内容优先** — 一流的 Markdown 支持
3. **灵活 UI** — 可混合使用 React、Vue、Svelte 组件

## 部署流程

```bash
npm create astro@latest
npx astro add cloudflare
npm run build
npx wrangler pages deploy dist
```

## 总结

Astro + Cloudflare 非常适合个人博客：开发体验好、性能优秀、完全免费。
