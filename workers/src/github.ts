const REPO = "huangyuan0315-design/lemonhy-blog";

export async function triggerDeploy(hookId: string) {
  if (!hookId) return;
  await fetch(`https://api.cloudflare.com/client/v4/pages/webhook/deploy_hooks/${hookId}`, {
    method: "POST",
  });
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "lemonhy-blog",
  };
}

function apiBase(path: string) {
  return `https://api.github.com/repos/${REPO}/contents/${path}`;
}

function decodeBase64(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export async function getFile(token: string, path: string) {
  const res = await fetch(apiBase(path), { headers: headers(token) });
  if (!res.ok) return null;
  const data: any = await res.json();
  return { sha: data.sha, content: decodeBase64(data.content), size: data.size };
}

export async function listDir(token: string, path: string) {
  const res = await fetch(apiBase(path), { headers: headers(token) });
  if (!res.ok) return [];
  const data: any = await res.json();
  return data.map((f: any) => ({ name: f.name, path: f.path, sha: f.sha, size: f.size }));
}

export async function createOrUpdateFile(
  token: string,
  path: string,
  content: string,
  sha?: string,
  isBase64 = false
) {
  const body: any = {
    message: sha ? `更新 ${path}` : `创建 ${path}`,
    content: isBase64 ? content : encodeBase64(content),
  };
  if (sha) body.sha = sha;

  const res = await fetch(apiBase(path), {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json() as any;
}

export async function deleteFile(token: string, path: string, sha: string) {
  const res = await fetch(apiBase(path), {
    method: "DELETE",
    headers: headers(token),
    body: JSON.stringify({ message: `删除 ${path}`, sha }),
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
}

export function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };
  const frontmatter: Record<string, any> = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      const val = m[2].trim();
      frontmatter[m[1]] = val.startsWith("[") ? JSON.parse(val) : val.replace(/^"(.*)"$/, "$1");
    }
  }
  return { frontmatter, body: match[2].trimStart() };
}

export function buildFrontmatter(fm: Record<string, any>, body: string) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) lines.push(`${k}: [${v.map((t) => `"${t}"`).join(", ")}]`);
    else if (typeof v === "string") lines.push(`${k}: "${v}"`);
    else lines.push(`${k}: ${v}`);
  }
  lines.push("---");
  lines.push("");
  lines.push(body);
  return lines.join("\n");
}
