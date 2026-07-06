import { Hono } from "hono";
import type { Bindings } from "../types";
import { adminAuth } from "../middleware/auth";

const app = new Hono<{ Bindings: Bindings }>();

function sanitize(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .trim()
    .slice(0, 500);
}

// GET /api/comments/:slug — 获取已批准评论
app.get("/api/comments/:slug", async (c) => {
  const slug = c.req.param("slug").replace(/--/g, "/");
  const { results } = await c.env.DB.prepare(
    "SELECT id, post_slug, author, body, status, created_at FROM comments WHERE post_slug = ? AND status = 'approved' ORDER BY created_at ASC"
  )
    .bind(slug)
    .all();

  return c.json(results);
});

// POST /api/comments/:slug — 提交新评论
app.post("/api/comments/:slug", async (c) => {
  const slug = c.req.param("slug").replace(/--/g, "/");
  const body = await c.req.json<{ author?: string; body?: string }>();

  if (!body.author || !body.body) {
    return c.text("昵称和评论内容不能为空", { status: 400 });
  }

  const author = sanitize(body.author);
  const content = sanitize(body.body);

  if (!author || !content) {
    return c.text("昵称和评论内容不能为空", { status: 400 });
  }

  await c.env.DB.prepare(
    "INSERT INTO comments (post_slug, author, body) VALUES (?, ?, ?)"
  )
    .bind(slug, author, content)
    .run();

  return c.json({ message: "评论已提交，审核通过后将显示" }, { status: 201 });
});

// GET /api/admin/comments — 获取所有评论（管理员）
app.get("/api/admin/comments", adminAuth, async (c) => {
  const status = c.req.query("status");
  let query = "SELECT id, post_slug, author, body, status, created_at FROM comments";
  const params: any[] = [];

  if (status) {
    query += " WHERE status = ?";
    params.push(status);
  }
  query += " ORDER BY created_at DESC LIMIT 100";

  const { results } = await c.env.DB.prepare(query)
    .bind(...params)
    .all();

  return c.json(results);
});

// PATCH /api/admin/comments/:id — 修改评论状态
app.patch("/api/admin/comments/:id", adminAuth, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ status: string }>();

  if (!["approved", "pending", "spam"].includes(body.status)) {
    return c.text("无效的状态值", { status: 400 });
  }

  await c.env.DB.prepare("UPDATE comments SET status = ? WHERE id = ?")
    .bind(body.status, id)
    .run();

  return c.json({ message: "更新成功" });
});

// DELETE /api/admin/comments/:id — 删除评论
app.delete("/api/admin/comments/:id", adminAuth, async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();
  return c.json({ message: "删除成功" });
});

export default app;
