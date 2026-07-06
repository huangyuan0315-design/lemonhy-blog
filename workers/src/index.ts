import { Hono } from "hono";
import type { Bindings } from "./types";
import { cors } from "./middleware/cors";
import comments from "./routes/comments";

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors);
app.route("/", comments);

app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
