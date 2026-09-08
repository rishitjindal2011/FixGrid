import { getAuthProvider } from "@/lib/auth/provider";
import { SiteHeaderSupabase } from "./site-header-supabase";
import { SiteHeaderClerk } from "./site-header-clerk";

export async function SiteHeader() {
  const provider = await getAuthProvider();
  
  if (provider === "clerk") {
    return <SiteHeaderClerk />;
  }
  
  return <SiteHeaderSupabase />;
}
