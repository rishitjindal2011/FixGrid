import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getAllPublishedBlogPosts } from "@/lib/queries/blog";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const posts = await getAllPublishedBlogPosts();
    return ok(posts);
  });
}
