import { Hono } from "hono";
import type { Bindings } from "../types";
import { adminAuth } from "../middleware/auth";
import { listDir, createOrUpdateFile, deleteFile, getFile, triggerDeploy } from "../github";

const app = new Hono<{ Bindings: Bindings }>();

const IMG_DIR = "public/images";

// ── PUBLIC: gallery ──
app.get("/api/public/images", async (c) => {
  try {
    const { results: dbRows } = await c.env.DB.prepare(
      "SELECT name, captured_at, uploaded_at FROM images ORDER BY captured_at DESC, uploaded_at DESC"
    ).all();

    const images = (dbRows as any[]).map((r) => ({
      name: r.name,
      url: `/images/${r.name}`,
      date: r.captured_at || r.uploaded_at,
    }));

    if (images.length === 0 && c.env.GITHUB_TOKEN) {
      try {
        const files = await listDir(c.env.GITHUB_TOKEN, IMG_DIR);
        for (const f of files) {
          if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f.name) && !images.find((img) => img.name === f.name)) {
            images.push({ name: f.name, url: `/images/${f.name}`, date: "" });
          }
        }
      } catch {}
    }

    return c.json(images.slice(0, 200));
  } catch (e: any) {
    return c.json([], { status: 200 });
  }
});

// ── ADMIN: image management ──

// LIST
app.get("/api/admin/images", adminAuth, async (c) => {
  try {
    const files = await listDir(c.env.GITHUB_TOKEN, IMG_DIR);
    const { results } = await c.env.DB.prepare("SELECT name, captured_at, uploaded_at FROM images").all();
    const meta: Record<string, any> = {};
    for (const r of results as any[]) meta[r.name] = r;

    return c.json(
      files
        .filter((f) => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f.name))
        .map((f) => ({
          name: f.name,
          path: f.path,
          sha: f.sha,
          url: `https://raw.githubusercontent.com/huangyuan0315-design/lemonhy-blog/master/${f.path}`,
          size: f.size,
          captured_at: meta[f.name]?.captured_at || null,
          uploaded_at: meta[f.name]?.uploaded_at || null,
        }))
        .sort((a, b) => (b.captured_at || b.uploaded_at || "").localeCompare(a.captured_at || a.uploaded_at || ""))
    );
  } catch (e: any) {
    return c.json({ error: e.message }, { status: 500 });
  }
});

// UPLOAD batch
app.post("/api/admin/images", adminAuth, async (c) => {
  try {
    const { files } = await c.req.json<{ files: { name: string; data: string; captured_at?: string }[] }>();
    const results = [];
    for (const f of files) {
      const path = `${IMG_DIR}/${f.name}`;
      await createOrUpdateFile(c.env.GITHUB_TOKEN, path, f.data, undefined, true);
      // Store metadata in D1
      await c.env.DB.prepare(
        "INSERT OR REPLACE INTO images (name, captured_at, uploaded_at) VALUES (?, ?, datetime('now'))"
      ).bind(f.name, f.captured_at || null).run();
      results.push({ name: f.name, path });
    }
    triggerDeploy(c.env.DEPLOY_HOOK_ID);
    return c.json(results, { status: 201 });
  } catch (e: any) {
    return c.json({ error: e.message }, { status: 500 });
  }
});

// DELETE batch
app.delete("/api/admin/images", adminAuth, async (c) => {
  try {
    const { names } = await c.req.json<{ names: string[] }>();
    for (const name of names) {
      const path = `${IMG_DIR}/${name}`;
      const file = await getFile(c.env.GITHUB_TOKEN, path);
      if (file) await deleteFile(c.env.GITHUB_TOKEN, path, file.sha);
      await c.env.DB.prepare("DELETE FROM images WHERE name = ?").bind(name).run();
    }
    triggerDeploy(c.env.DEPLOY_HOOK_ID);
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: e.message }, { status: 500 });
  }
});


export default app;
