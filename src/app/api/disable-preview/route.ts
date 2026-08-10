import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

/** Clear the draft cookie and return the visitor to the published site. */
export const dynamic = "force-dynamic";

export async function GET() {
  const draft = await draftMode();
  draft.disable();
  redirect("/");
}
