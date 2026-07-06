import { Hono } from "hono";
import type { Bindings } from "./types";
import { cors } from "./middleware/cors";
import comments from "./routes/comments";
import articles from "./routes/articles";
import images from "./routes/images";

const app = new Hono<{ Bindings: Bindings }>();

app.use("/*", cors);
app.route("/", comments);
app.route("/", articles);
app.route("/", images);

app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
