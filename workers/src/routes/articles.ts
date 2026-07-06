import { Hono } from "hono";
import type { Bindings } from "../types";
import { adminAuth } from "../middleware/auth";
import {
  listDir,
  getFile,
  createOrUpdateFile,
  deleteFile,
  parseFrontmatter,
  buildFrontmatter,
} from "../github";

const app = new Hono<{ Bindings: Bindings }>();
app.use("/*", adminAuth);

const POSTS_DIR = "src/content/posts";

// LIST
app.get("/api/admin/articles", async (c) => {
  try {
    const files = await listDir(c.env.GITHUB_TOKEN, POSTS_DIR);
    // Expand subdirs
    const all: any[] = [];
    for (const f of files) {
      if (f.name.endsWith(".md")) {
        all.push(f);
      } else {
        const sub = await listDir(c.env.GITHUB_TOKEN, `${POSTS_DIR}/${f.name}`);
        for (const s of sub) all.push(s);
      }
    }
    // Get article details
    const articles = await Promise.all(
      all.map(async (f) => {
        const file = await getFile(c.env.GITHUB_TOKEN, f.path);
        if (!file) return null;
        const { frontmatter } = parseFrontmatter(file.content);
        return { path: f.path, sha: f.sha, ...frontmatter };
      })
    );
    return c.json(articles.filter(Boolean).sort((a: any, b: any) => (b.pubDate || "").localeCompare(a?.pubDate || "")));
  } catch (e: any) {
    return c.json({ error: e.message }, { status: 500 });
  }
});

// GET single
app.get("/api/admin/articles/:category/:slug", async (c) => {
  try {
    const { category, slug } = c.req.param();
    const path = `${POSTS_DIR}/${category}/${slug}.md`;
    const file = await getFile(c.env.GITHUB_TOKEN, path);
    if (!file) return c.json({ error: "Not found" }, { status: 404 });
    const { frontmatter, body } = parseFrontmatter(file.content);
    return c.json({ path, sha: file.sha, frontmatter, body });
  } catch (e: any) {
    return c.json({ error: e.message }, { status: 500 });
  }
});

// CREATE
app.post("/api/admin/articles", async (c) => {
  try {
    const { title, description, pubDate, category, tags, body } = await c.req.json();
    const slug = pubDate.slice(0, 10) + "-" + title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\-]/g, "");
    const path = `${POSTS_DIR}/${category}/${slug}.md`;
    const content = buildFrontmatter({ title, description, pubDate, category, tags }, body);
    await createOrUpdateFile(c.env.GITHUB_TOKEN, path, content);
    return c.json({ path, slug }, { status: 201 });
  } catch (e: any) {
    return c.json({ error: e.message }, { status: 500 });
  }
});

// UPDATE
app.put("/api/admin/articles/:category/:slug", async (c) => {
  try {
    const { title, description, pubDate, category, tags, body } = await c.req.json();
    const { category: cat, slug } = c.req.param();
    const oldPath = `${POSTS_DIR}/${cat}/${slug}.md`;
    const oldFile = await getFile(c.env.GITHUB_TOKEN, oldPath);
    if (!oldFile) return c.json({ error: "Not found" }, { status: 404 });

    const newCat = category || cat;
    const newSlug = pubDate ? pubDate.slice(0, 10) + "-" + title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\-]/g, "") : slug;
    const path = `${POSTS_DIR}/${newCat}/${newSlug}.md`;
    const content = buildFrontmatter(
      { title, description, pubDate, category: newCat, tags },
      body
    );

    if (path !== oldPath) {
      await deleteFile(c.env.GITHUB_TOKEN, oldPath, oldFile.sha);
    }
    await createOrUpdateFile(c.env.GITHUB_TOKEN, path, content, path === oldPath ? oldFile.sha : undefined);
    return c.json({ path, slug: newSlug });
  } catch (e: any) {
    return c.json({ error: e.message }, { status: 500 });
  }
});

// DELETE
app.delete("/api/admin/articles/:category/:slug", async (c) => {
  try {
    const { category, slug } = c.req.param();
    const path = `${POSTS_DIR}/${category}/${slug}.md`;
    const file = await getFile(c.env.GITHUB_TOKEN, path);
    if (!file) return c.json({ error: "Not found" }, { status: 404 });
    await deleteFile(c.env.GITHUB_TOKEN, path, file.sha);
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: e.message }, { status: 500 });
  }
});

export default app;
