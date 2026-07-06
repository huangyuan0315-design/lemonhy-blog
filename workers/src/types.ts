export interface Bindings {
  DB: D1Database;
  ADMIN_PASSWORD: string;
  ALLOWED_ORIGIN: string;
  GITHUB_TOKEN: string;
}

export interface Comment {
  id: number;
  post_slug: string;
  author: string;
  body: string;
  status: "pending" | "approved" | "spam";
  created_at: string;
}
