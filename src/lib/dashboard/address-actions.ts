"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/**
 * Address book writes.
 *
 * RLS on `user_addresses` scopes every row to its owner, so these actions do not
 * re-check ownership — they filter on `user_id` anyway, because a filtered-out
 * UPDATE or DELETE reports success with zero rows rather than an error, and a
 * "saved" message over a write that touched nothing is the worst outcome here.
 */

export interface AddressActionState {
  error: string | null;
  success: boolean;
  message?: string;
}

const AddressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z
    .string()
    .trim()
    .max(60, "Keep the label under 60 characters.")
    .optional()
    .transform((value) => (value ? value : null)),
  line1: z
    .string()
    .trim()
    .min(3, "Enter the first line of the address.")
    .max(200, "Keep it under 200 characters."),
  line2: z
    .string()
    .trim()
    .max(200, "Keep it under 200 characters.")
    .optional()
    .transform((value) => (value ? value : null)),
  city: z
    .string()
    .trim()
    .max(120, "Keep the town under 120 characters.")
    .optional()
    .transform((value) => (value ? value : null)),
  postcode: z
    .string()
    .trim()
    .max(16, "That postcode looks too long.")
    .optional()
    .transform((value) => (value ? value : null)),
  isDefault: z.boolean(),
});

function parse(formData: FormData) {
  return AddressSchema.safeParse({
    id: formData.get("id") || undefined,
    label: formData.get("label") ?? undefined,
    line1: formData.get("line1"),
    line2: formData.get("line2") ?? undefined,
    city: formData.get("city") ?? undefined,
    postcode: formData.get("postcode") ?? undefined,
    isDefault: formData.get("isDefault") === "on" || formData.get("isDefault") === "1",
  });
}

/**
 * Exactly one address can be the default.
 *
 * Cleared in a separate statement before the insert or update, because Postgres
 * has no partial-unique way to say "one true per user" that also lets you flip
 * which one it is without a transaction. Two writes, and the window between them
 * is a user's own two clicks — not a concurrency risk worth a stored procedure.
 */
async function clearOtherDefaults(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  exceptId?: string,
) {
  let query = supabase
    .from("user_addresses")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);

  if (exceptId) query = query.neq("id", exceptId);

  const { error } = await query;
  if (error) console.error("[addresses] clearing defaults failed", error.message);
}

export async function saveAddress(
  _prev: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the address and try again.",
      success: false,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to save an address.", success: false };

  const { id, label, line1, line2, city, postcode, isDefault } = parsed.data;

  // The first address a customer saves becomes their default whatever the
  // checkbox said: an address book where nothing is default makes every future
  // booking form open on an empty picker.
  const { count } = await supabase
    .from("user_addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const shouldDefault = isDefault || (count ?? 0) === 0;

  if (shouldDefault) await clearOtherDefaults(supabase, user.id, id);

  const row = {
    user_id: user.id,
    label,
    line1,
    line2,
    city,
    postcode,
    country: "GB",
    is_default: shouldDefault,
  };

  const { error } = id
    ? await supabase.from("user_addresses").update(row).eq("id", id).eq("user_id", user.id)
    : await supabase.from("user_addresses").insert(row);

  if (error) {
    console.error("[addresses] save failed", { code: error.code, message: error.message });
    if (error.code === "42P01") {
      return {
        error: "Address storage is not set up on this database yet.",
        success: false,
      };
    }
    return { error: "That address could not be saved. Try again.", success: false };
  }

  revalidatePath("/dashboard/settings/addresses");
  revalidatePath("/dashboard/discover", "layout");

  return { error: null, success: true, message: id ? "Address updated." : "Address saved." };
}

export async function deleteAddress(
  _prev: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "That address could not be found.", success: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to manage addresses.", success: false };

  const { data, error } = await supabase
    .from("user_addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, is_default")
    .maybeSingle<{ id: string; is_default: boolean }>();

  if (error) {
    console.error("[addresses] delete failed", { code: error.code, message: error.message });
    return { error: "That address could not be removed.", success: false };
  }
  if (!data) return { error: "That address could not be found.", success: false };

  // Removing the default leaves the book with none, so promote the oldest
  // survivor rather than leaving every future booking form blank.
  if (data.is_default) {
    const { data: next } = await supabase
      .from("user_addresses")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (next) {
      await supabase.from("user_addresses").update({ is_default: true }).eq("id", next.id);
    }
  }

  revalidatePath("/dashboard/settings/addresses");
  return { error: null, success: true, message: "Address removed." };
}
