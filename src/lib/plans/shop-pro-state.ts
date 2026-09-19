/**
 * State definitions for the ₹999/- Shop Pro subscription flow.
 *
 * Placed in a dedicated state file because `shop-pro-actions.ts` is marked
 * `"use server"`, and Next.js requires `"use server"` files to only export
 * async functions.
 */

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
