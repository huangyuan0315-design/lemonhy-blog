import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE } from "../lib/constants";

export async function GET() {
  const posts = await getCollection("posts");
  const published = posts
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: SITE.url,
    items: published.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}`,
    })),
  });
}
