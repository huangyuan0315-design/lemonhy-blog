import { Hono } from "hono";
import type { Bindings } from "../types";
import { adminAuth } from "../middleware/auth";
import { listDir, createOrUpdateFile, deleteFile, getFile } from "../github";

const app = new Hono<{ Bindings: Bindings }>();
app.use("/*", adminAuth);

const IMG_DIR = "public/images";

// LIST
app.get("/api/admin/images", async (c) => {
  try {
    const files = await listDir(c.env.GITHUB_TOKEN, IMG_DIR);
    return c.json(
      files
        .filter((f) => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f.name))
        .map((f) => ({
          name: f.name,
          path: f.path,
          sha: f.sha,
          url: `https://raw.githubusercontent.com/huangyuan0315-design/lemonhy-blog/master/${f.path}`,
          size: f.size,
        }))
    );
  } catch (e: any) {
    return c.json({ error: e.message }, { status: 500 });
  }
});

// UPLOAD batch
app.post("/api/admin/images", async (c) => {
  try {
    const { files } = await c.req.json<{ files: { name: string; data: string }[] }>();
    const results = [];
    for (const f of files) {
      const path = `${IMG_DIR}/${f.name}`;
      await createOrUpdateFile(c.env.GITHUB_TOKEN, path, f.data, undefined, true);
      results.push({ name: f.name, path });
    }
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
    }
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: e.message }, { status: 500 });
  }
});

export default app;
