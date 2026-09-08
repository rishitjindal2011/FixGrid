import { getAuthProvider } from "@/lib/auth/provider";
import { SignUpFormSupabase } from "./sign-up-form-supabase";
import { SignUpFormClerk } from "./sign-up-form-clerk";

export async function SignUpForm({ next }: { next?: string }) {
  const provider = await getAuthProvider();
  
  if (provider === "clerk") {
    return <SignUpFormClerk next={next} />;
  }
  
  return <SignUpFormSupabase next={next} />;
}
