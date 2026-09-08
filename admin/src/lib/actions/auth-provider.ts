"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setAuthProvider(provider: "supabase" | "clerk") {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("seo_global")
    .update({ auth_provider: provider })
    .eq("id", 1);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
}
