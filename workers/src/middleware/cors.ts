import type { Context, Next } from "hono";
import type { Bindings } from "../types";

export async function cors(c: Context<{ Bindings: Bindings }>, next: Next) {
  const origin = c.req.header("Origin") || "";

  c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  c.header("Access-Control-Max-Age", "86400");

  if (c.req.method === "OPTIONS") {
    return c.text("OK", { status: 204 });
  }

  await next();
}
