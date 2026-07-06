import type { Context, Next } from "hono";
import type { Bindings } from "../types";

export async function adminAuth(c: Context<{ Bindings: Bindings }>, next: Next) {
  const auth = c.req.header("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");

  if (!token || token !== c.env.ADMIN_PASSWORD) {
    return c.json({ error: "Unauthorized" }, { status: 401 });
  }

  await next();
}
