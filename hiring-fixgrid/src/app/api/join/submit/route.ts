import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(admin: ReturnType<typeof createAdminClient>, name: string): Promise<string> {
  const base = slugify(name) || "workshop";
  for (let attempt = 0; attempt < 15; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data } = await admin
      .from("fixer_profiles")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle<{ id: string }>();

    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString().slice(-4)}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      shopName,
      legalName,
      taxId,
      address,
      contactPhone,
      contactEmail,
      specialization,
      benchCapacity,
      notes,
      evidencePaths = [],
      evidenceBase64 = [], // optional array of { name, type, base64 }
      password,
      userId: providedUserId,
    } = body;

    if (!shopName || !address || !contactPhone || !contactEmail) {
      return NextResponse.json(
        { error: "Workshop name, address, contact phone, and official email are required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Resolve or create user account
    let userId = providedUserId;

    if (!userId) {
      // Try to find if user already exists
      const { data: usersData } = await admin.auth.admin.listUsers();
      const existingUser = usersData?.users?.find(
        (u) => u.email?.toLowerCase() === contactEmail.toLowerCase()
      );

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: newUser, error: createError } = await admin.auth.admin.createUser({
          email: contactEmail,
          password: password || "VytronWorkshop2026!",
          email_confirm: true,
          user_metadata: {
            full_name: shopName,
            role: "shop",
            portal: "hiring",
          },
        });

        if (createError) {
          console.warn("[join-submit] User creation notice:", createError.message);
          // Fallback to random UUID if auth fails
          userId = crypto.randomUUID();
        } else {
          userId = newUser.user.id;
        }
      }
    }

    // 2. Upload any base64 evidence files directly to shop-claims-evidence bucket
    const finalEvidencePaths: string[] = [...evidencePaths];

    if (Array.isArray(evidenceBase64) && evidenceBase64.length > 0) {
      for (const item of evidenceBase64) {
        try {
          const buffer = Buffer.from(item.base64.split(",")[1] || item.base64, "base64");
          const ext = (item.name?.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
          const filePath = `${userId}/${crypto.randomUUID()}.${ext}`;

          const { error: uploadError } = await admin.storage
            .from("shop-claims-evidence")
            .upload(filePath, buffer, {
              contentType: item.type || "image/png",
              upsert: true,
            });

          if (!uploadError) {
            finalEvidencePaths.push(filePath);
          } else {
            console.warn("[join-submit] Storage upload notice:", uploadError.message);
            finalEvidencePaths.push(`[File: ${item.name || "Evidence file"}]`);
          }
        } catch (storageErr) {
          console.warn("[join-submit] Error processing file attachment:", storageErr);
        }
      }
    }

    // 3. Generate unique slug
    const slug = await uniqueSlug(admin, shopName);

    // 4. Create fixer_profile (IS_HIDDEN: TRUE, VERIFIED: FALSE)
    const bioText = [
      specialization ? `Specialization: ${specialization}` : null,
      legalName ? `Legal Entity: ${legalName}` : null,
      taxId ? `GSTIN / Tax ID: ${taxId}` : null,
      benchCapacity ? `Bench Capacity: ${benchCapacity} active stations` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const { data: shop, error: shopError } = await admin
      .from("fixer_profiles")
      .insert({
        slug,
        shop_name: shopName,
        address,
        contact_phone: contactPhone,
        owner_id: userId,
        is_hidden: true, // HIDDEN UNTIL ADMIN ACCEPTS
        verified: false, // NOT VERIFIED UNTIL ADMIN ACCEPTS
        accepts_bookings: false,
        bio: bioText || undefined,
      })
      .select("id, slug")
      .single<{ id: string; slug: string }>();

    if (shopError) {
      console.error("[join-submit] Failed to insert fixer profile:", shopError);
      return NextResponse.json(
        { error: `Database error creating workshop: ${shopError.message}` },
        { status: 500 }
      );
    }

    // 5. Build Evidence Text with explicit Portal origin tag
    const evidenceTextLines = [
      "[Portal: hiring.vytron.me]",
      legalName ? `Legal Registered Entity: ${legalName}` : null,
      taxId ? `GSTIN / Business Registration: ${taxId}` : null,
      specialization ? `Specialization: ${specialization}` : null,
      benchCapacity ? `Bench Capacity: ${benchCapacity} active technician stations` : null,
      contactEmail ? `Official Email: ${contactEmail}` : null,
      notes ? `Operational Notes: ${notes}` : null,
      finalEvidencePaths.length > 0
        ? `Uploaded evidence (${finalEvidencePaths.length}):\n${finalEvidencePaths.map((p) => `• ${p}`).join("\n")}`
        : "Evidence: Physical bench inspection requested via portal verification desk.",
    ].filter(Boolean);

    const evidence = evidenceTextLines.join("\n");

    // 6. Insert into shop_claims (STATUS: PENDING)
    const { data: claim, error: claimError } = await admin
      .from("shop_claims")
      .insert({
        fixer_id: shop.id,
        user_id: userId,
        status: "pending",
        evidence,
        contact_phone: contactPhone,
      })
      .select("id, status, created_at")
      .single();

    if (claimError) {
      console.error("[join-submit] Failed to create shop claim:", claimError);
      // Rollback shop so we don't leave orphaned hidden shops without claims
      await admin.from("fixer_profiles").delete().eq("id", shop.id);
      return NextResponse.json(
        { error: `Failed to file claim to admin queue: ${claimError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      shopId: shop.id,
      claimId: claim.id,
      slug: shop.slug,
      is_hidden: true,
      portal: "hiring",
      message: "Workshop application submitted for administrative review.",
    });
  } catch (err: any) {
    console.error("[join-submit] Unexpected error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process workshop application." },
      { status: 500 }
    );
  }
}
