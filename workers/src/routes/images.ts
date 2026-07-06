import { Hono } from "hono";
import type { Bindings } from "../types";
import { adminAuth } from "../middleware/auth";
import { listDir, createOrUpdateFile, deleteFile, getFile, triggerDeploy } from "../github";

const app = new Hono<{ Bindings: Bindings }>();

const IMG_DIR = "public/images";

// ── PUBLIC: gallery ──
app.get("/api/public/images", async (c) => {
  try {
    // Fetch both GitHub file listing and D1 metadata
    const [files, { results: dbRows }] = await Promise.all([
      listDir(c.env.GITHUB_TOKEN, IMG_DIR).catch(() => []),
      c.env.DB.prepare("SELECT name, captured_at, uploaded_at FROM images").all(),
    ]);

    const dbMeta: Record<string, any> = {};
    for (const r of dbRows as any[]) dbMeta[r.name] = r;

    const images = files
      .filter((f) => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f.name))
      .map((f) => ({
        name: f.name,
        url: `/images/${f.name}`,
        date: dbMeta[f.name]?.captured_at || dbMeta[f.name]?.uploaded_at || "",
      }));

    // Also include D1 entries not in GitHub
    for (const r of dbRows as any[]) {
      if (!images.find((img) => img.name === r.name)) {
        images.push({
          name: r.name,
          url: `/images/${r.name}`,
          date: r.captured_at || r.uploaded_at,
        });
      }
    }

    images.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return c.json(images.slice(0, 200));
  } catch (e: any) {
    return c.json({ error: e.message }, { status: 500 });
  }
});

// ── ADMIN: image management ──
app.use("/*", adminAuth);

// LIST
app.get("/api/admin/images", async (c) => {
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
app.post("/api/admin/images", async (c) => {
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
app.delete("/api/admin/images", async (c) => {
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
