import { found, handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getPublishedPage, splitPath } from "@/lib/queries/cms";
import { ApiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  return handle(async () => {
    const { slug } = await params;
    const pathSegments = splitPath(slug);
    
    if (!pathSegments) {
      throw new ApiError(400, "invalid_request", "Invalid slug provided.");
    }
    
    const page = found(
      await getPublishedPage(pathSegments.pathPrefix, pathSegments.slug),
      "That page could not be found.",
    );
    return ok(page);
  });
}
