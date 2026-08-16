import "server-only";

import QRCode from "qrcode";

/**
 * The scannable half of the top-up flow.
 *
 * **What this QR contains, and why it is not a `upi://pay` link.** A real
 * `upi://pay?pa=<vpa>&am=<amount>` QR opens the phone's actual UPI app, where PIN
 * entry and settlement happen inside the bank's application — outside anything
 * this codebase can reach. So there is no version of that which asks for a real
 * PIN and does not move real money: if the payee VPA is valid, the payment is
 * valid. A QR with a deliberately broken VPA would open the real app and then
 * fail at validation, which looks authentic for two seconds and can never
 * complete.
 *
 * This QR therefore encodes an ordinary `https`/`http` URL to a page in this app.
 * Any phone camera opens it, the page is styled as a UPI sheet, and completing it
 * really does credit the wallet through the same ledger path the desktop form
 * uses. Everything about it is real except the bank.
 *
 * The payee details below are cosmetic — they are what the sheet displays, not
 * anything a payment is routed to. `@mock` rather than a plausible bank handle,
 * on purpose: if this ever leaks into a screenshot it should be obvious that no
 * real account is involved.
 */

/** Displayed on the payment sheet. Not a routable address. */
export const PAYEE_VPA = "fixgrid@mock";
export const PAYEE_NAME = "FixGrid";

/**
 * The URL the QR points at.
 *
 * Takes the origin rather than reading it, so the caller decides — in practice
 * `getRequestOrigin()` from `src/lib/auth/origin.ts`, which returns the host the
 * operator is actually browsing. That matters more here than anywhere else in the
 * app: a QR generated while the dashboard is open on `localhost` encodes
 * `localhost`, and a phone scanning it resolves that to *itself*.
 */
export function buildPayUrl(origin: string, payToken: string): string {
  return `${origin.replace(/\/+$/, "")}/pay/${encodeURIComponent(payToken)}`;
}

/**
 * True when a phone will not be able to reach this origin.
 *
 * Callers surface this as a message rather than hiding the QR: a code that
 * silently does not work is worse than one shown with an explanation of why, and
 * the fix — open the dashboard on the machine's LAN address — is something only
 * the person at the keyboard can do.
 */
export function isUnreachableFromPhone(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.endsWith(".local")
    );
  } catch {
    return true;
  }
}

/**
 * The QR as an inline SVG string.
 *
 * SVG rather than a data-URL PNG so it stays sharp at any size and adds no image
 * request; generated on the server so `qrcode` never reaches the client bundle.
 *
 * Error correction level M — the default, and the right trade here. `H` would
 * survive a more damaged print at the cost of a denser code, and this is a code
 * displayed on a screen for thirty seconds, not printed on a van.
 */
export async function payQrSvg(url: string): Promise<string | null> {
  try {
    return await QRCode.toString(url, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      // Colour is applied by the caller through CSS on the wrapper; the SVG
      // itself is plain black on white so it scans reliably in poor light.
      color: { dark: "#111827", light: "#FFFFFF" },
      width: 240,
    });
  } catch (error) {
    // A QR that will not render must not take the wallet page down. The typed
    // UPI-ID path still works, so the customer has a way through.
    console.error(
      "[upi] QR generation failed",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
