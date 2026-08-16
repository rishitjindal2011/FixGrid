"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { chargeToPlatform } from "@/lib/wallet/server";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { JoinState } from "@/lib/join/state";
import { ENROLLMENT_FEE_MINOR } from "@/lib/join/state";

/**
 * Expert-submitted shops.
 *
 * The shape of this action is dictated by one existing RLS policy. `claimant
 * opens own claim` refuses any claim whose target shop already has an
 * `owner_id`:
 *
 *   not exists (select 1 from fixer_profiles f
 *                where f.id = shop_claims.fixer_id and f.owner_id is not null)
 *
 * That rule is right for the original flow — you cannot claim a shop somebody
 * already owns — but this flow deliberately sets `owner_id` at once so the
 * submitter gets their dashboard immediately. The two cannot both hold under
 * the caller's own privileges, so both inserts run through the service-role
 * client. That is a real decision, not a convenience: it means the checks the
 * policies would have made are now this function's responsibility, which is why
 * the session is resolved first and every written id comes from it rather than
 * from the form.
 */


const MAX_FILES = 4;

/**
 * Evidence arrives as storage paths, not files.
 *
 * The first version of this action took `File` objects through the form and
 * uploaded them server-side. That fails: a Server Action body is capped at 1 MB
 * by default, and four 5 MB photographs are nowhere near it. Raising
 * `bodySizeLimit` would buy headroom while still round-tripping every byte
 * through the Next server for no reason.
 *
 * So the browser uploads straight to Storage — the `claimant uploads own
 * evidence` policy permits exactly that, scoped to a folder named after the
 * caller's own uid — and only the resulting paths arrive here. Those paths are
 * re-checked against the session below, because a path in a form field is a
 * claim about a file rather than proof of one.
 */
const EvidencePathSchema = z
  .string()
  .trim()
  .min(1)
  .max(400)
  // No traversal, no absolute paths, no escaping into another user's folder.
  .refine(
    (path) => !path.includes("..") && !path.startsWith("/"),
    "That file path is not valid.",
  );

const JoinSchema = z.object({
  shopName: z
    .string()
    .trim()
    .min(2, "Enter the name customers know you by.")
    .max(120, "Keep the shop name under 120 characters."),
  address: z
    .string()
    .trim()
    .min(6, "Enter the full street address.")
    .max(300, "Keep the address under 300 characters."),
  // Mirrors `fixer_profiles_phone_shape`, which is enforced on this column — an
  // invalid number here would come back as an opaque 23514 from the insert.
  contactPhone: z
    .string()
    .trim()
    .regex(
      /^[0-9+][0-9 ()+-]{5,24}$/,
      "Use digits, spaces and + ( ) - only, at least 6 characters.",
    ),
  notes: z.string().trim().max(2000, "Keep the notes under 2000 characters.").optional(),
});

/** `"Ravi's Repair Cafe"` -> `"ravis-repair-cafe"`. */
function slugify(name: string): string {
  return (
    name
      .normalize("NFKD")
      // Strip the combining marks NFKD just split off, so an accented letter
      // becomes its base letter rather than a letter plus a mark that the next
      // rule would turn into a stray hyphen.
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      // Apostrophes are dropped, not hyphenated: "Ravi's" should slug to
      // "ravis", not "ravi-s". Every other run of non-alphanumerics becomes a
      // single separator.
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
  );
}


/**
 * A slug nobody is using.
 *
 * Derived server-side rather than taken from the form: the slug is the shop's
 * public URL, and letting a submitter choose it invites both collisions and
 * deliberate impersonation of an existing listing.
 *
 * The uniqueness check runs on the admin client because `fixer_profiles` now
 * hides pending shops from ordinary readers — a slug taken by somebody else's
 * unapproved submission would look free, and the insert would then fail on the
 * unique index with an error the submitter can do nothing about.
 */
async function uniqueSlug(admin: ReturnType<typeof createAdminClient>, name: string) {
  const base = slugify(name) || "shop";

  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data, error } = await admin
      .from("fixer_profiles")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle<{ id: string }>();

    if (error) return null;
    if (!data) return candidate;
  }

  return null;
}

export async function submitShop(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in first — a shop has to belong to an account.", field: null };
  }

  const parsed = JoinSchema.safeParse({
    shopName: formData.get("shopName"),
    address: formData.get("address"),
    contactPhone: formData.get("contactPhone"),
    notes: formData.get("notes") ?? undefined,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: issue?.message ?? "Check the form and try again.",
      field: (issue?.path[0] as JoinState["field"]) ?? null,
    };
  }

  const rawPaths = formData
    .getAll("evidencePaths")
    .filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "");

  if (rawPaths.length === 0) {
    return {
      error: "Attach at least one photo — a licence, your storefront or a business card.",
      field: "evidence",
    };
  }
  if (rawPaths.length > MAX_FILES) {
    return { error: `Attach at most ${MAX_FILES} files.`, field: "evidence" };
  }

  const uploaded: string[] = [];

  for (const raw of rawPaths) {
    const path = EvidencePathSchema.safeParse(raw);
    if (!path.success) {
      return { error: "One of those files could not be read.", field: "evidence" };
    }

    // The session decides the folder, not the form. Without this a signed-in
    // user could post a path pointing into somebody else's evidence folder and
    // attach their licence photograph to this claim.
    if (!path.data.startsWith(`${user.id}/`)) {
      return { error: "One of those files could not be read.", field: "evidence" };
    }

    uploaded.push(path.data);
  }

  const admin = createAdminClient();
  const { shopName, address, contactPhone, notes } = parsed.data;

  const slug = await uniqueSlug(admin, shopName);
  if (!slug) {
    return {
      error: "We could not create a web address for that name. Try a slightly different one.",
      field: "shopName",
    };
  }

  /*
   * The files are already in the bucket, so confirm they exist before writing
   * rows that point at them. A claim whose evidence is missing is one an admin
   * cannot judge, and the submitter would never know why it was rejected.
   */
  for (const path of uploaded) {
    const slash = path.lastIndexOf("/");
    const { data: found, error } = await admin.storage
      .from("shop-claims-evidence")
      .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 });

    if (error || !found || found.length === 0) {
      return {
        error: "One of those files did not finish uploading. Try attaching it again.",
        field: "evidence",
      };
    }
  }

  // The shop. Hidden, but owned from this moment — that pairing is the whole
  // point: the dashboard opens immediately while the directory stays clean.
  const { data: shop, error: shopError } = await admin
    .from("fixer_profiles")
    .insert({
      slug,
      shop_name: shopName,
      address,
      contact_phone: contactPhone,
      owner_id: user.id,
      is_hidden: true,
      verified: false,
      // Nothing is bookable until they set real availability and services, and
      // a shop taking requests it cannot service is worse than one that is quiet.
      accepts_bookings: false,
    })
    .select("id, slug")
    .single<{ id: string; slug: string }>();

  if (shopError) {
    console.error("[join] shop insert failed", {
      code: shopError.code,
      message: shopError.message,
      details: shopError.details,
    });

    if (shopError.code === "23505") {
      return { error: "A shop with that web address already exists.", field: "shopName" };
    }
    if (shopError.code === "23514") {
      return { error: "The phone number was rejected. Check the format.", field: "contactPhone" };
    }
    return { error: "We could not create the shop. Try again in a moment.", field: null };
  }

  const evidence = [
    notes?.trim() ? notes.trim() : null,
    `Uploaded evidence (${uploaded.length}):`,
    ...uploaded.map((path) => `• ${path}`),
  ]
    .filter(Boolean)
    .join("\n");

  const { error: claimError } = await admin.from("shop_claims").insert({
    fixer_id: shop.id,
    user_id: user.id,
    status: "pending",
    evidence,
    contact_phone: contactPhone,
  });

  if (claimError) {
    // The shop exists and is owned, so the submitter is not blocked — but with
    // no claim there is nothing in the admin queue and it would never go public.
    // Roll the shop back rather than stranding it invisibly forever.
    console.error("[join] claim insert failed", {
      code: claimError.code,
      message: claimError.message,
    });

    await admin.from("fixer_profiles").delete().eq("id", shop.id);

    return {
      error: "We could not file your verification request. Try again in a moment.",
      field: null,
    };
  }

  /*
   * The enrollment fee.
   *
   * Charged last, once the shop and its claim both exist, and rolled back the same
   * way the claim failure is: taking money and then failing to create the listing
   * it paid for is the one outcome worth extra code to avoid.
   *
   * Charged on *submission*, not on approval, which is the whole point of it — a
   * fee taken only from shops we accept would deter nobody from submitting. It is
   * returned in full if we reject the listing; see `rejectClaim` in the admin app.
   */
  const charge = await chargeToPlatform({
    kind: "enrollment",
    amountMinor: ENROLLMENT_FEE_MINOR,
    from: { kind: "user", ownerId: user.id },
    memo: `Listing fee — ${shopName}`,
  });

  if (!charge.ok) {
    // Nothing was created that the submitter can use, so remove both rather than
    // leaving an unpaid listing in the review queue.
    await admin.from("shop_claims").delete().eq("fixer_id", shop.id);
    await admin.from("fixer_profiles").delete().eq("id", shop.id);

    return {
      // `charge.error` is already a sentence — `explainMoney` turns an
      // insufficient balance into one. Prefixed with the amount and the refund
      // promise, because both are things the submitter needs before deciding
      // whether to top up and come back.
      error:
        `Listing a shop costs ${formatMoney(ENROLLMENT_FEE_MINOR)}, refunded in full ` +
        `if we cannot list you. ${charge.error}`,
      field: null,
    };
  }

  // Stamped by the service role, which the guard trigger lets past; an owner
  // cannot write these columns themselves.
  const { error: stampError } = await admin
    .from("fixer_profiles")
    .update({
      enrollment_fee_minor: ENROLLMENT_FEE_MINOR,
      enrollment_paid_at: new Date().toISOString(),
    })
    .eq("id", shop.id);

  if (stampError) {
    // The money moved and the ledger records it, so this is a bookkeeping gap
    // rather than a lost payment. Logged loudly instead of unwinding a successful
    // charge, because the listing itself is fine and the submitter should not be
    // sent back to the start over a stamp.
    console.error("[join] enrollment stamp failed — ledger is authoritative", {
      shopId: shop.id,
      amountMinor: ENROLLMENT_FEE_MINOR,
      message: stampError.message,
    });
  }

  revalidatePath("/dashboard/expert", "layout");
  revalidatePath("/dashboard", "layout");

  // Straight into the dashboard: there is real work to do — services, hours,
  // photos — and it can all be done while the claim waits.
  redirect("/dashboard/expert?submitted=1");
}
