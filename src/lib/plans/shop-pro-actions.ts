"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyShop } from "@/lib/dashboard/claims";
import { subscribeToShopProCore } from "@/lib/plans/shop-pro";

export interface ShopProActionState {
  success: boolean;
  error: string | null;
  message?: string | null;
}

export const SHOP_PRO_INITIAL_STATE: ShopProActionState = {
  success: false,
  error: null,
  message: null,
};

export async function purchaseShopProAction(
  _prev: ShopProActionState,
  _formData: FormData,
): Promise<ShopProActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Please sign in to manage your shop subscription." };
  }

  const shop = await getMyShop(user.id);
  if (!shop) {
    return { success: false, error: "No registered workshop found for this account." };
  }

  const result = await subscribeToShopProCore(user.id, shop.id);
  if (!result.ok) {
    return { success: false, error: result.message };
  }

  // Revalidate relevant routes
  revalidatePath("/dashboard/expert/plan");
  revalidatePath("/dashboard/expert");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard");

  return {
    success: true,
    error: null,
    message: result.data.message,
  };
}
