import { found, handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getPublishedBlogPost } from "@/lib/queries/blog";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  return handle(async () => {
    const { slug } = await params;
    const post = found(
      await getPublishedBlogPost(slug),
      "That blog post could not be found.",
    );
    return ok(post);
  });
}
